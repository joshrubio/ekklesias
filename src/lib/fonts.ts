import {
  DM_Serif_Display,
  Fraunces,
  Geist,
  Lora,
  Merriweather,
  Montserrat,
  Noto_Sans_Arabic,
  Playfair_Display,
  Poppins,
  Space_Grotesk,
} from "next/font/google";

// next/font exige opciones literales en cada llamada (sin spread ni variables).
// Las tipografías que solo usan algunas iglesias van sin precarga: se descargan al usarse.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });
const arabic = Noto_Sans_Arabic({ variable: "--font-arabic", subsets: ["arabic"] });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], preload: false });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"], preload: false });
const merriweather = Merriweather({
  variable: "--font-merriweather",
  weight: ["400", "700"],
  subsets: ["latin"],
  preload: false,
});
const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  weight: "400",
  subsets: ["latin"],
  preload: false,
});
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], preload: false });
const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  preload: false,
});
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  preload: false,
});

export const fontClassNames = [
  geistSans,
  fraunces,
  arabic,
  playfair,
  lora,
  merriweather,
  dmSerif,
  montserrat,
  poppins,
  spaceGrotesk,
]
  .map((f) => f.variable)
  .join(" ");
