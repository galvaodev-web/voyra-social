export const isGithubPages =
  process.env.NEXT_PUBLIC_DEPLOY_TARGET === "github-pages";

export const githubPagesBasePath = isGithubPages ? "/voyra-social" : "";

