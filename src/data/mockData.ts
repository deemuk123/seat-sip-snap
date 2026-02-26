// Mock data for shows, menu items, etc.

export interface Show {
  id: string;
  movieName: string;
  screenNumber: number;
  showTime: string;
  language: string;
  format: string;
  posterUrl: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  available: boolean;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface Order {
  id: string;
  orderCode: string;
  show: Show;
  items: CartItem[];
  deliveryMode: "seat" | "counter";
  seatNumber?: string;
  status: "received" | "preparing" | "out-for-delivery" | "delivered" | "cancelled";
  total: number;
  createdAt: string;
  estimatedDelivery: string;
}

export const mockShows: Show[] = [
  {
    id: "1",
    movieName: "Dune: Part Three",
    screenNumber: 1,
    showTime: "14:30",
    language: "English",
    format: "IMAX 3D",
    posterUrl: "",
  },
  {
    id: "2",
    movieName: "The Dark Knight Returns",
    screenNumber: 3,
    showTime: "17:00",
    language: "English",
    format: "Dolby Atmos",
    posterUrl: "",
  },
  {
    id: "3",
    movieName: "Pushpa 3",
    screenNumber: 2,
    showTime: "19:45",
    language: "Telugu",
    format: "4DX",
    posterUrl: "",
  },
  {
    id: "4",
    movieName: "Avatar: Fire & Ash",
    screenNumber: 4,
    showTime: "21:15",
    language: "English",
    format: "IMAX 3D",
    posterUrl: "",
  },
];

export const menuCategories = [
  "All",
  "Popcorn",
  "Combos",
  "Beverages",
  "Snacks",
  "Premium",
  "Offers",
];

export const mockMenuItems: MenuItem[] = [
  {
    id: "m1",
    name: "Classic Butter Popcorn",
    description: "Large tub of freshly popped corn with golden butter",
    price: 250,
    category: "Popcorn",
    imageUrl: "",
    available: true,
  },
  {
    id: "m2",
    name: "Caramel Crunch Popcorn",
    description: "Sweet caramel coated popcorn with a satisfying crunch",
    price: 300,
    category: "Popcorn",
    imageUrl: "",
    available: true,
  },
  {
    id: "m3",
    name: "Movie Night Combo",
    description: "Large popcorn + 2 drinks + nachos with cheese",
    price: 599,
    category: "Combos",
    imageUrl: "",
    available: true,
  },
  {
    id: "m4",
    name: "Couple's Delight",
    description: "2 Large popcorns + 2 cold drinks + chocolate brownie",
    price: 799,
    category: "Combos",
    imageUrl: "",
    available: true,
  },
  {
    id: "m5",
    name: "Iced Cola",
    description: "Chilled cola with ice, 500ml",
    price: 150,
    category: "Beverages",
    imageUrl: "",
    available: true,
  },
  {
    id: "m6",
    name: "Fresh Lime Soda",
    description: "Refreshing lime soda with mint",
    price: 120,
    category: "Beverages",
    imageUrl: "",
    available: true,
  },
  {
    id: "m7",
    name: "Loaded Nachos",
    description: "Crispy nachos with jalapeño cheese sauce & salsa",
    price: 220,
    category: "Snacks",
    imageUrl: "",
    available: true,
  },
  {
    id: "m8",
    name: "Chicken Hot Dog",
    description: "Grilled chicken sausage in a toasted bun with mustard",
    price: 180,
    category: "Snacks",
    imageUrl: "",
    available: false,
  },
  {
    id: "m9",
    name: "Gourmet Cheese Platter",
    description: "Assorted premium cheeses with crackers and grapes",
    price: 650,
    category: "Premium",
    imageUrl: "",
    available: true,
  },
  {
    id: "m10",
    name: "Weekend Special: Family Pack",
    description: "2 Large popcorns + 4 drinks + 2 snacks at 20% off",
    price: 999,
    category: "Offers",
    imageUrl: "",
    available: true,
  },
];

export function generateOrderCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
