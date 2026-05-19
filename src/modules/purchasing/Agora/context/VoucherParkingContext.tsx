import { createContext, useContext, useState, ReactNode } from 'react';

export interface VoucherService {
  id: string;
  label: string;
  categoryId: string;
  categoryLabel: string;
}

export type VoucherStatus = 'saved' | 'in_cart' | 'purchased';

export interface VoucherStay {
  dateFrom?: string;
  dateTo?: string;
  location?: string;
  adults?: number;
  children?: number;
}

export interface VoucherPackage {
  id: string;
  title: string;
  description: string;
  services: VoucherService[];
  price: number;
  nights: number;
  code: string;
  stay?: VoucherStay;
  status?: VoucherStatus;
  purchasedAt?: number;
}

interface VoucherParkingContextType {
  vouchers: VoucherPackage[];
  addVoucher: (v: VoucherPackage) => void;
  removeVoucher: (id: string) => void;
  markInCart: (id: string) => void;
  purchaseVoucher: (id: string) => void;
  clear: () => void;
  hasVoucher: (id: string) => boolean;
}

const Ctx = createContext<VoucherParkingContextType | undefined>(undefined);

export function VoucherParkingProvider({ children }: { children: ReactNode }) {
  const [vouchers, setVouchers] = useState<VoucherPackage[]>([]);

  const addVoucher = (v: VoucherPackage) =>
    setVouchers((prev) => {
      if (prev.some((p) => p.id === v.id)) return prev;
      return [...prev, { ...v, status: v.status ?? 'saved' }];
    });

  const removeVoucher = (id: string) =>
    setVouchers((prev) => prev.filter((v) => v.id !== id));

  const markInCart = (id: string) =>
    setVouchers((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: 'in_cart' } : v)),
    );

  const purchaseVoucher = (id: string) =>
    setVouchers((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, status: 'purchased', purchasedAt: Date.now() } : v,
      ),
    );

  const clear = () => setVouchers([]);

  const hasVoucher = (id: string) => vouchers.some((v) => v.id === id);

  return (
    <Ctx.Provider
      value={{
        vouchers,
        addVoucher,
        removeVoucher,
        markInCart,
        purchaseVoucher,
        clear,
        hasVoucher,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useVoucherParking() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useVoucherParking must be used within VoucherParkingProvider');
  return c;
}
