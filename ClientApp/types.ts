export type TabType = "clients" | "products" | "rentals";

export interface Client {
    id: number;
    lastName: string;
    firstName: string;
    middleName: string | null;
    passportNumber: string;
    address: string | null;
    phone: string | null;
    fullName?: string;
}

export interface ClientDto {
    lastName: string;
    firstName: string;
    middleName: string | null;
    passportNumber: string;
    address: string | null;
    phone: string | null;
}

export interface Product {
    id: number;
    title: string;
    description: string | null;
    cost: number;
    dailyRentalPrice: number;
}

export interface ProductDto {
    title: string;
    description: string | null;
    cost: number;
    dailyRentalPrice: number;
}

export interface Rental {
    id: number;
    clientId: number;
    productId: number;
    issueDate: string;
    returnDate: string | null;
    client: Client | null;
    product: Product | null;
}

export interface RentalDto {
    clientId: number;
    productId: number;
    issueDate: string;
    returnDate: string | null;
}

export interface ApiErrorResponse {
    message?: string;
    title?: string;
}