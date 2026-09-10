const defaultMetadata = {
  title: 'Pet Fly Inc | International Pet Transportation',
  description: 'Pet Fly Inc provides safe international pet transportation, relocation planning, travel documents, and door-to-door pet travel support.',
  image: '/images/hero-bg.jpg',
  schema: {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: 'Pet Fly Inc',
    url: 'https://petflyinc.com',
    email: 'info@petflyinc.com',
    telephone: '+1-626-656-5666',
    description: 'International pet transportation and relocation services.'
  }
};

const pages = {
  '/': {
    title: 'Pet Fly Inc | International Pet Transportation',
    description: 'International pet transportation with personalized relocation planning, travel documents, airline coordination, and door-to-door support.',
    schema: defaultMetadata.schema
  },
  '/service': {
    title: 'International Pet Transport & Relocation Services | Pet Fly Inc',
    description: 'Door-to-door international pet transport, airline cargo coordination, travel documentation, customs support, and IATA-compliant travel planning.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'International Pet Transportation',
      provider: { '@type': 'ProfessionalService', name: 'Pet Fly Inc', url: 'https://petflyinc.com' },
      areaServed: 'Worldwide',
      serviceType: 'International pet transportation and relocation'
    }
  },
  '/quote': {
    title: 'Request an International Pet Transport Quote | Pet Fly Inc',
    description: 'Request a personalized quote for international pet travel, airline transport, door-to-door relocation, documents, and customs support.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'International Pet Transport Quote',
      provider: { '@type': 'ProfessionalService', name: 'Pet Fly Inc', url: 'https://petflyinc.com' },
      serviceType: 'International pet relocation consultation'
    }
  },
  '/regulations': {
    title: 'Pet Travel Regulations by Country & Airline | Pet Fly Inc',
    description: 'Research pet import regulations, vaccination requirements, travel documents, and airline pet policies before international travel.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Pet Travel Regulations by Country and Airline',
      about: 'International pet travel regulations'
    }
  },
  '/registry': {
    title: 'PetConnect Lost & Found Pet Network | Pet Fly Inc',
    description: 'PetConnect is a free lost and found pet network for microchip lookup, private owner contact, community alerts, and trusted local partners.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'PetConnect Lost and Found Pet Network',
      provider: { '@type': 'Organization', name: 'Pet Fly Inc', url: 'https://petflyinc.com' },
      isAccessibleForFree: true,
      serviceType: 'Lost and found pet assistance'
    }
  },
  '/contact': {
    title: 'Contact Pet Fly Inc | International Pet Transportation',
    description: 'Contact Pet Fly Inc for international pet transportation, travel documents, airline cargo planning, and pet relocation support.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Contact Pet Fly Inc'
    }
  },
  '/contract': {
    title: 'Pet Transport Contract Access | Pet Fly Inc',
    description: 'Access your Pet Fly Inc pet transportation contract using your issued contract number.',
    schema: { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Pet Transport Contract Access' }
  }
};

function getSeoMetadata(pathname, siteUrl = 'https://petflyinc.com') {
  const configured = pages[pathname] || defaultMetadata;
  const baseUrl = String(siteUrl).replace(/\/$/, '');
  return {
    ...defaultMetadata,
    ...configured,
    canonicalUrl: `${baseUrl}${pathname === '/' ? '/' : pathname}`,
    imageUrl: `${baseUrl}${configured.image || defaultMetadata.image}`
  };
}

module.exports = { getSeoMetadata };
