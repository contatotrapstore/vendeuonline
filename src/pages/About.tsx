'use client';

import { Heart, Users, Store, Award, MapPin, Phone, Mail, Clock, Target, Eye, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const About = () => {
  const stats = [
    { icon: Store, value: '50+', label: 'Lojas Parceiras', color: 'blue' },
    { icon: Users, value: '1000+', label: 'Usuários Ativos', color: 'green' },
    { icon: Award, value: '500+', label: 'Produtos', color: 'purple' },
    { icon: Heart, value: '4.8', label: 'Avaliação Média', color: 'red' }
  ];

  const values = [
    {
      icon: Target,
      title: 'Missão',
      description: 'Conectar empreendedores locais com consumidores de Erechim e região, fortalecendo a economia local através de uma plataforma digital moderna e acessível.'
    },
    {
      icon: Eye,
      title: 'Visão',
      description: 'Ser a principal plataforma de marketplace da região, promovendo o crescimento sustentável do comércio local e criando oportunidades para todos.'
    },
    {
      icon: Zap,
      title: 'Valores',
      description: 'Transparência, inovação, apoio ao empreendedorismo local, qualidade no atendimento e compromisso com o desenvolvimento da nossa comunidade.'
    }
  ];

  const team = [
    {
      name: 'João Silva',
      role: 'CEO & Fundador',
      image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20businessman%20ceo%20portrait&image_size=square',
      description: 'Empreendedor local com mais de 10 anos de experiência em tecnologia e e-commerce.'
    },
    {
      name: 'Maria Santos',
      role: 'Diretora de Marketing',
      image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20businesswoman%20marketing%20director&image_size=square',
      description: 'Especialista em marketing digital e relacionamento com clientes.'
    },
    {
      name: 'Pedro Costa',
      role: 'CTO',
      image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20tech%20developer%20cto&image_size=square',
      description: 'Desenvolvedor experiente focado em criar soluções tecnológicas inovadoras.'
    }
  ];

  const timeline = [
    {
      year: '2023',
      title: 'Fundação',
      description: 'Nascimento da ideia de criar um marketplace local para Erechim'
    },
    {
      year: '2024',
      title: 'Lançamento Beta',
      description: 'Primeiras lojas parceiras e início das operações'
    },
    {
      year: '2024',
      title: 'Expansão',
      description: 'Crescimento para toda a região e novas funcionalidades'
    },
    {
      year: '2025',
      title: 'Futuro',
      description: 'Planos de expansão e novas tecnologias'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 text-white py-20">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Sobre o <span className="text-yellow-300">Vendeu Online</span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
              O marketplace que conecta Erechim e região, fortalecendo o comércio local 
              através da tecnologia e inovação.
            </p>
            <div className="flex items-center justify-center space-x-2 text-blue-200">
              <MapPin className="h-5 w-5" />
              <span>Erechim - RS, Brasil</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-16 bg-white">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center">
                  <div className={`w-16 h-16 bg-${stat.color}-100 rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <Icon className={`h-8 w-8 text-${stat.color}-600`} />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</div>
                  <div className="text-gray-600">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mission, Vision, Values */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Nossos Valores</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Conheça os princípios que guiam nossa jornada e nosso compromisso 
              com a comunidade de Erechim.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <div key={index} className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{value.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Our Story */}
      <div className="py-16 bg-white">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Nossa História</h2>
              <div className="space-y-6 text-gray-600">
                <p>
                  O Vendeu Online nasceu da necessidade de fortalecer o comércio local 
                  de Erechim e região. Percebemos que muitos empreendedores locais 
                  tinham dificuldades para alcançar novos clientes e competir no 
                  ambiente digital.
                </p>
                <p>
                  Nossa plataforma foi criada especificamente para atender às 
                  necessidades da nossa comunidade, oferecendo uma solução completa 
                  e acessível para vendedores locais expandirem seus negócios online.
                </p>
                <p>
                  Hoje, somos orgulhosos de conectar centenas de empreendedores 
                  com milhares de consumidores, contribuindo para o crescimento 
                  econômico sustentável da nossa região.
                </p>
              </div>
            </div>
            <div className="relative">
              <img
                src="https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=erechim%20city%20marketplace%20local%20business%20community&image_size=landscape_4_3"
                alt="Erechim e região"
                className="rounded-xl shadow-lg"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Nossa Jornada</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Acompanhe os principais marcos da nossa trajetória e nossos planos para o futuro.
            </p>
          </div>
          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-blue-200"></div>
            <div className="space-y-12">
              {timeline.map((item, index) => (
                <div key={index} className={`flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className="flex-1">
                    <div className={`bg-white rounded-xl p-6 shadow-lg ${index % 2 === 0 ? 'mr-8' : 'ml-8'}`}>
                      <div className="text-blue-600 font-bold text-lg mb-2">{item.year}</div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                      <p className="text-gray-600">{item.description}</p>
                    </div>
                  </div>
                  <div className="w-4 h-4 bg-blue-600 rounded-full border-4 border-white shadow-lg z-10"></div>
                  <div className="flex-1"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="py-16 bg-white">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Nossa Equipe</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Conheça as pessoas apaixonadas que trabalham todos os dias para 
              fazer o Vendeu Online crescer e evoluir.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                />
                <h3 className="text-xl font-bold text-gray-900 mb-2">{member.name}</h3>
                <p className="text-blue-600 font-semibold mb-3">{member.role}</p>
                <p className="text-gray-600 text-sm">{member.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="py-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Entre em Contato</h2>
            <p className="text-blue-100 max-w-2xl mx-auto">
              Tem alguma dúvida ou sugestão? Estamos sempre prontos para ouvir 
              nossa comunidade e melhorar nossos serviços.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4">
                <Phone className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-2">Telefone</h3>
              <p className="text-blue-100">(54) 3321-1234</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4">
                <Mail className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-2">E-mail</h3>
              <p className="text-blue-100">contato@vendeuonline.com.br</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-2">Horário</h3>
              <p className="text-blue-100">Segunda a sexta, 8h às 18h</p>
            </div>
          </div>
          <div className="text-center mt-12">
            <Link
              to="/contact"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center space-x-2"
            >
              <Mail className="h-5 w-5" />
              <span>Enviar Mensagem</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;