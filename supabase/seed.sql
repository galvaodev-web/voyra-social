-- Destination catalog only. No fictional users or posts.
begin;
insert into social.destinations(id,name,slug,country,image_url,category,description,season) values
('10000000-0000-4000-8000-000000000001','Roma','roma','Itália','https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=85','História','Entre ruas de pedra, uma boa mesa e dois mil anos de histórias.','Primavera e outono são convites para explorar a pé.'),
('10000000-0000-4000-8000-000000000002','Paris','paris','França','https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=85','Romântico','Pequenas descobertas em cada arrondissement.','Cada estação revela uma Paris diferente.'),
('10000000-0000-4000-8000-000000000003','Tóquio','toquio','Japão','https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=85','Comida','Tradição, luzes e sabores que ficam na memória.','Flores na primavera, folhas coloridas no outono.'),
('10000000-0000-4000-8000-000000000004','Lisboa','lisboa','Portugal','https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1200&q=85','Baixo custo','Miradouros, azulejos e tempo para uma última pastelaria.','O verão convida a aproveitar os dias longos.'),
('10000000-0000-4000-8000-000000000005','Bali','bali','Indonésia','https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=85','Natureza','Arrozais, templos e caminhos para desacelerar.','Planeje a viagem considerando a estação das chuvas.'),
('10000000-0000-4000-8000-000000000006','Buenos Aires','buenos-aires','Argentina','https://images.unsplash.com/photo-1589909202802-8f4aadce1849?auto=format&fit=crop&w=1200&q=85','Comida','Cafés de bairro, livrarias e noites que se estendem.','Primavera e outono para passear pelos bairros.'),
('10000000-0000-4000-8000-000000000007','Santiago','santiago','Chile','https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=85','Aventura','A cidade como ponto de partida para os Andes.','Neve no inverno e trilhas no verão.'),
('10000000-0000-4000-8000-000000000008','Nova York','nova-york','Estados Unidos','https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?auto=format&fit=crop&w=1200&q=85','História','Um mundo de possibilidades, um bairro de cada vez.','Do frio do inverno aos parques no verão.')
on conflict (slug) do nothing;
commit;
