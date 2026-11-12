// MOCK: BE và spec chưa có API sản phẩm. Dữ liệu lấy từ thiết kế trang Sản phẩm.
// Ảnh nằm trong public/store/products/. Muốn đổi ảnh thật: thả file vào thư mục đó và sửa imageUrl.
import { wait } from "./api/common";

export const PRODUCT_CATEGORIES = [
  "Điện tử",
  "Thời trang",
  "Gia dụng",
  "Phụ kiện",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface StoreProduct {
  sku: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  imageUrl: string;
}

export const MOCK_PRODUCTS: StoreProduct[] = [
  {
    sku: "SKU-EP01",
    name: "Tai nghe Bluetooth chống ồn Pro ANC",
    description: "Chuẩn âm Hi-Res, pin 40h liên tục",
    price: 1890000,
    category: "Điện tử",
    imageUrl: "/store/products/SKU-EP01.svg",
  },
  {
    sku: "SKU-SW02",
    name: "Đồng hồ thông minh Sport Ultra",
    description: "Đo nhịp tim SpO2, chuẩn chống nước 5ATM",
    price: 2450000,
    category: "Điện tử",
    imageUrl: "/store/products/SKU-SW02.svg",
  },
  {
    sku: "SKU-KB03",
    name: "Bàn phím cơ không dây RGB Hot-swap",
    description: "Switch cơ Gateron êm ái, kết nối 3 chế độ",
    price: 980000,
    category: "Phụ kiện",
    imageUrl: "/store/products/SKU-KB03.svg",
  },
  {
    sku: "SKU-JK04",
    name: "Áo khoác Bomber phong cách Streetwear",
    description: "Chất vải dù chống nước 2 lớp cao cấp",
    price: 650000,
    category: "Thời trang",
    imageUrl: "/store/products/SKU-JK04.svg",
  },
  {
    sku: "SKU-AF05",
    name: "Nồi chiên không dầu điện tử 6.5L",
    description: "Công nghệ nướng đối lưu Rapid Air 360 độ",
    price: 1450000,
    category: "Gia dụng",
    imageUrl: "/store/products/SKU-AF05.svg",
  },
  {
    sku: "SKU-RV06",
    name: "Robot hút bụi lau nhà cảm biến Laser",
    description: "Lập bản đồ 3D LiDAR, lực hút 5000Pa",
    price: 4200000,
    category: "Gia dụng",
    imageUrl: "/store/products/SKU-RV06.svg",
  },
  {
    sku: "SKU-SN07",
    name: "Giày thể thao Retro Runner Classic",
    description: "Đế đệm khí êm ái, chất liệu da lộn phối lưới",
    price: 1150000,
    category: "Thời trang",
    imageUrl: "/store/products/SKU-SN07.svg",
  },
  {
    sku: "SKU-MS08",
    name: "Chuột Gaming siêu nhẹ Wireless 2.4G",
    description: "Trọng lượng chỉ 58g, cảm biến PAW3395",
    price: 200000,
    category: "Điện tử",
    imageUrl: "/store/products/SKU-MS08.svg",
  },
];

export async function listStoreProducts(): Promise<StoreProduct[]> {
  await wait(300);
  return structuredClone(MOCK_PRODUCTS);
}
