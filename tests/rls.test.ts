import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
const a = "a0000000-0000-4000-8000-000000000001",
  b = "b0000000-0000-4000-8000-000000000002",
  c = "c0000000-0000-4000-8000-000000000003";
const pub = "10000000-0000-4000-8000-000000000001",
  followers = "10000000-0000-4000-8000-000000000002",
  priv = "10000000-0000-4000-8000-000000000003",
  draft = "10000000-0000-4000-8000-000000000004";
let db: PGlite;
async function asUser(id: string, sql: string) {
  await db.exec(
    `reset role;select set_config('request.jwt.claim.sub','${id}',false);set role authenticated;`,
  );
  return db.exec(sql);
}
async function admin(sql: string) {
  await db.exec("reset role;");
  return db.exec(sql);
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth,storage to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant select on storage.objects to anon,authenticated;create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name,'/') $$;`,
  );
  const migration = readFileSync(
    "supabase/migrations/202609110001_social.sql",
    "utf8",
  ).replace("create extension if not exists pgcrypto;", "");
  await db.exec(migration);
  await db.exec(
    readFileSync("supabase/migrations/202609110002_creator.sql", "utf8"),
  );
  await db.exec(
    `insert into auth.users(id) values('${a}'),('${b}'),('${c}');select set_config('request.jwt.claim.sub','${a}',false);insert into social.posts(id,author_id,type,caption,visibility,status) values('${pub}','${a}','TEXT','Public experience','PUBLIC','PUBLISHED'),('${followers}','${a}','TEXT','Followers experience','FOLLOWERS','PUBLISHED'),('${priv}','${a}','TEXT','Private experience','PRIVATE','PUBLISHED'),('${draft}','${a}','TEXT','Draft experience','PUBLIC','DRAFT');`,
  );
});
afterAll(async () => {
  await db?.close();
});
describe("RLS em PostgreSQL embarcado, com papéis reais", () => {
  it("visitante só lê posts públicos publicados", async () => {
    await db.exec(
      `reset role;select set_config('request.jwt.claim.sub','',false);set role anon;`,
    );
    const r = await db.query<{ id: string }>("select id from social.posts");
    expect(r.rows.map((x) => x.id)).toEqual([pub]);
  });
  it("autor lê seus posts e terceiro não lê privados", async () => {
    await asUser(a, "select 1");
    expect((await db.query("select id from social.posts")).rows).toHaveLength(
      4,
    );
    await asUser(b, "select 1");
    expect((await db.query("select id from social.posts")).rows).toHaveLength(
      1,
    );
  });
  it("follow habilita FOLLOWERS; self follow e duplicata falham; unfollow revoga", async () => {
    await asUser(
      b,
      `insert into social.follows(follower_id,following_id) values('${b}','${a}')`,
    );
    expect((await db.query("select id from social.posts")).rows).toHaveLength(
      2,
    );
    await expect(
      db.exec(
        `insert into social.follows(follower_id,following_id) values('${b}','${a}')`,
      ),
    ).rejects.toThrow();
    await expect(
      db.exec(
        `insert into social.follows(follower_id,following_id) values('${b}','${b}')`,
      ),
    ).rejects.toThrow();
    await db.exec(`delete from social.follows where follower_id='${b}'`);
    expect((await db.query("select id from social.posts")).rows).toHaveLength(
      1,
    );
  });
  it("curtida é única e removível, sem acesso a post privado", async () => {
    await asUser(
      b,
      `insert into social.post_likes(post_id,user_id) values('${pub}','${b}')`,
    );
    await expect(
      db.exec(
        `insert into social.post_likes(post_id,user_id) values('${pub}','${b}')`,
      ),
    ).rejects.toThrow();
    await expect(
      db.exec(
        `insert into social.post_likes(post_id,user_id) values('${priv}','${b}')`,
      ),
    ).rejects.toThrow();
    await db.exec("delete from social.post_likes");
    expect(
      (await db.query("select * from social.post_likes")).rows,
    ).toHaveLength(0);
  });
  it("comentário e resposta têm autoria protegida", async () => {
    await asUser(
      b,
      `insert into social.comments(id,post_id,author_id,content) values('${b}','${pub}','${b}','Uma dica útil!')`,
    );
    await asUser(
      c,
      `insert into social.comments(post_id,author_id,parent_comment_id,content) values('${pub}','${c}','${b}','Obrigado!')`,
    );
    await db.exec(`delete from social.comments where id='${b}'`);
    expect(
      (await db.query(`select * from social.comments where id='${b}'`)).rows,
    ).toHaveLength(1);
    await expect(
      db.exec(
        `insert into social.comments(post_id,author_id,content) values('${pub}','${b}','Impersonation')`,
      ),
    ).rejects.toThrow();
  });
  it("coleções e salvos não vazam a outro usuário", async () => {
    await asUser(
      b,
      `insert into social.saved_posts(post_id,user_id) values('${pub}','${b}');insert into social.collections(id,user_id,name) values('${b}','${b}','Europa 2027');insert into social.collection_items(collection_id,post_id) values('${b}','${pub}');`,
    );
    await asUser(c, "select 1");
    expect(
      (await db.query("select * from social.collections")).rows,
    ).toHaveLength(0);
    expect(
      (await db.query("select * from social.collection_items")).rows,
    ).toHaveLength(0);
    expect(
      (await db.query("select * from social.saved_posts")).rows,
    ).toHaveLength(0);
    await expect(
      db.exec(
        `insert into social.collection_items(collection_id,post_id) values('${b}','${pub}')`,
      ),
    ).rejects.toThrow();
  });
  it("destination follow pertence ao usuário", async () => {
    await admin(
      `insert into social.destinations(id,name,slug,country,image_url,category) values('${pub}','Roma','roma','Itália','https://example.com/roma.jpg','História')`,
    );
    await asUser(
      b,
      `insert into social.destination_follows values('${b}','${pub}',now())`,
    );
    await asUser(c, "select 1");
    expect(
      (await db.query("select * from social.destination_follows")).rows,
    ).toHaveLength(0);
    await expect(
      db.exec(
        `insert into social.destination_follows values('${b}','${pub}',now())`,
      ),
    ).rejects.toThrow();
  });
  it("criação exige rascunho do próprio autor e finalização valida mídia", async () => {
    await asUser(
      b,
      `insert into social.posts(id,author_id,type,caption) values('${b}','${b}','IMAGE','Foto sem mídia')`,
    );
    await expect(
      db.exec(`select social.finalize_post('${b}')`),
    ).rejects.toThrow();
    await expect(
      db.exec(
        `insert into social.posts(author_id,type,caption,status) values('${b}','TEXT','Bypass publish','PUBLISHED')`,
      ),
    ).rejects.toThrow();
    await expect(
      db.exec(
        `insert into social.posts(author_id,type,caption) values('${a}','TEXT','Impersonation')`,
      ),
    ).rejects.toThrow();
  });
  it("bloqueio remove follow e impede visualização e interações", async () => {
    await asUser(
      b,
      `insert into social.follows(follower_id,following_id) values('${b}','${a}')`,
    );
    await asUser(
      a,
      `insert into social.user_blocks(blocker_id,blocked_id) values('${a}','${b}')`,
    );
    await asUser(b, "select 1");
    expect(
      (await db.query(`select * from social.posts where author_id='${a}'`))
        .rows,
    ).toHaveLength(0);
    await expect(
      db.exec(
        `insert into social.follows(follower_id,following_id) values('${b}','${a}')`,
      ),
    ).rejects.toThrow();
    await expect(
      db.exec(
        `insert into social.comments(post_id,author_id,content) values('${pub}','${b}','Blocked')`,
      ),
    ).rejects.toThrow();
    expect(
      (await db.query(`select * from social.follows where following_id='${a}'`))
        .rows,
    ).toHaveLength(0);
  });
  it("não permite elevação de privilégio por RPC interna", async () => {
    await asUser(c, "select 1");
    await expect(
      db.exec(`select social.consume_rate('posts',999999)`),
    ).rejects.toThrow();
    await expect(
      db.exec(`update social.posts set status='PUBLISHED' where id='${draft}'`),
    ).rejects.toThrow();
  });
});
