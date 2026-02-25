interface Project {
  title: string
  description: string
  href?: string
  imgSrc?: string
}

const projectsData: Project[] = [
  {
    title: 'Hurricane Damage Estimation',
    description:
      'Led cyclone damage prediction using pre/post disaster satellite imagery and SBA insurance data at UIUC. Built a Siamese Change Detection network achieving 0.804 IoU. Invited to GeoPython 2020 as guest speaker.',
    href: 'https://github.com/shubhamgoel27',
  },
  {
    title: 'Skin Cancer Detection',
    description:
      'Built an early skin cancer detection module at Triangulate Labs using CycleGANs for melanoma lesion progression data and Siamese networks achieving 97.5% accuracy on synthetic datasets. Shipped as an iOS app using ARKit.',
  },
  {
    title: 'Building Detection (Reliance Jio)',
    description:
      'Co-authored "Building detection in dense and cluttered regions using Reverse Mask R-CNN". Automated population estimation from satellite imagery for JioFiber rollout across 50M households. Beat SOTA mIoU from 75% to 84.3%.',
  },
  {
    title: 'Kaggle: Fisheries Monitoring',
    description:
      'Built a classifier for The Nature Conservancy Fisheries Monitoring competition to identify species of tunas, sharks, and other fish. Ranked top 14% (314 / 2,293 teams).',
    href: 'https://www.kaggle.com/c/the-nature-conservancy-fisheries-monitoring',
  },
]

export default projectsData
