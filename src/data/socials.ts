import { Icons } from "../components/Icons";
interface SocialMediaDetail {
    name: string;
    href: string;
    icon: keyof typeof Icons;
    iconalt: string;
}

interface Socials {
    [key: string]: SocialMediaDetail;
}

const socials: Socials = {
    github: {
        name: "GitHub",
        href: "https://github.com/shubhamgoel27",
        icon: "github",
        iconalt: "GitHub logo"
    },
    linkedin: {
        name: "LinkedIn",
        href: "https://www.linkedin.com/in/shubhamgoel27/",
        icon: "linkedin",
        iconalt: "LinkedIn logo"
    },
}

export const { github, linkedin } = socials;

export default socials;
