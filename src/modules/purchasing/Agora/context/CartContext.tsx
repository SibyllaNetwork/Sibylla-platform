import { createContext, useContext, useMemo, useState, ReactNode } from 'react';

/* Cart can hold two item kinds. Use the `kind` discriminator to branch UI. */

export interface ProductCartItem {
  kind: 'product';
  id: string;
  categoryId: string;
  productClassId: string;
  name: string;
  supplier: string;
  price: number;
  quantity: number;
  image: string;
  unit: string;
}

export interface StayCartItem {
  kind: 'stay';
  id: string;
  name: string;
  location: string;
  image: string;
  pricePerNight: number;
  nights: number;
  adults: number;
  children: number;
  checkIn: string | null;
  checkOut: string | null;
  stars: number;
  rooms: string;
}

export interface PackageCartService {
  categoryLabel: string;
  label: string;
  venue?: string;
  address?: string;
}

export interface PackageCartItem {
  kind: 'package';
  id: string;
  voucherId: string;
  title: string;
  description: string;
  code: string;
  price: number;
  nights: number;
  services: PackageCartService[];
  dateFrom?: string;
  dateTo?: string;
  location?: string;
  adults?: number;
  children?: number;
}

export type CartItem = ProductCartItem | StayCartItem | PackageCartItem;

interface CartContextType {
  items: CartItem[];
  addProduct: (item: Omit<ProductCartItem, 'kind' | 'quantity'>, quantity: number) => void;
  addStay: (item: Omit<StayCartItem, 'kind'>) => void;
  addPackage: (item: Omit<PackageCartItem, 'kind'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateStayNights: (id: string, nights: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addProduct: CartContextType['addProduct'] = (item, quantity) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.kind === 'product' && i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.kind === 'product' && i.id === item.id
            ? { ...i, quantity: i.quantity + quantity }
            : i,
        );
      }
      return [...prev, { kind: 'product', ...item, quantity }];
    });
  };

  const addPackage: CartContextType['addPackage'] = (item) => {
    setItems((prev) => {
      if (prev.some((i) => i.kind === 'package' && i.id === item.id)) return prev;
      return [...prev, { kind: 'package', ...item }];
    });
  };

  const addStay: CartContextType['addStay'] = (item) => {
    setItems((prev) => {
      // one entry per (hotel + checkIn/checkOut). If same dates, replace.
      const idx = prev.findIndex(
        (i) =>
          i.kind === 'stay' &&
          i.id === item.id &&
          i.checkIn === item.checkIn &&
          i.checkOut === item.checkOut,
      );
      if (idx >= 0) {
        const clone = [...prev];
        clone[idx] = { kind: 'stay', ...item };
        return clone;
      }
      return [...prev, { kind: 'stay', ...item }];
    });
  };

  const removeItem: CartContextType['removeItem'] = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity: CartContextType['updateQuantity'] = (id, quantity) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.kind === 'product' && i.id === id ? { ...i, quantity } : i)),
    );
  };

  const updateStayNights: CartContextType['updateStayNights'] = (id, nights) => {
    if (nights <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.kind === 'stay' && i.id === id ? { ...i, nights } : i)),
    );
  };

  const clearCart = () => setItems([]);

  const { totalItems, totalPrice } = useMemo(() => {
    let count = 0;
    let price = 0;
    for (const it of items) {
      if (it.kind === 'product') {
        count += it.quantity;
        price += it.price * it.quantity;
      } else if (it.kind === 'stay') {
        count += 1;
        price += it.pricePerNight * it.nights;
      } else {
        count += 1;
        price += it.price;
      }
    }
    return { totalItems: count, totalPrice: price };
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        addProduct,
        addStay,
        addPackage,
        removeItem,
        updateQuantity,
        updateStayNights,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
