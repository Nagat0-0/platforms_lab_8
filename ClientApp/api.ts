import {
    ApiErrorResponse,
    Client,
    ClientDto,
    Product,
    ProductDto,
    Rental,
    RentalDto
} from "./types.js";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options?.headers ?? {})
        }
    });

    if (!response.ok) {
        let message = `Помилка сервера (${response.status})`;
        try {
            const errorBody = (await response.json()) as ApiErrorResponse;
            if (errorBody.message) {
                message = errorBody.message;
            } else if (errorBody.title) {
                message = errorBody.title;
            }
        } catch {
            // ignore non-json error body
        }
        throw new Error(message);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return (await response.json()) as T;
}

export const api = {
    clients: {
        getAll: (): Promise<Client[]> => request<Client[]>("/api/clients"),
        create: (dto: ClientDto): Promise<Client> =>
            request<Client>("/api/clients", {
                method: "POST",
                body: JSON.stringify(dto)
            }),
        update: (id: number, dto: ClientDto): Promise<Client> =>
            request<Client>(`/api/clients/${id}`, {
                method: "PUT",
                body: JSON.stringify(dto)
            }),
        delete: (id: number): Promise<void> =>
            request<void>(`/api/clients/${id}`, {
                method: "DELETE"
            })
    },
    products: {
        getAll: (): Promise<Product[]> => request<Product[]>("/api/products"),
        create: (dto: ProductDto): Promise<Product> =>
            request<Product>("/api/products", {
                method: "POST",
                body: JSON.stringify(dto)
            }),
        update: (id: number, dto: ProductDto): Promise<Product> =>
            request<Product>(`/api/products/${id}`, {
                method: "PUT",
                body: JSON.stringify(dto)
            }),
        delete: (id: number): Promise<void> =>
            request<void>(`/api/products/${id}`, {
                method: "DELETE"
            })
    },
    rentals: {
        getAll: (): Promise<Rental[]> => request<Rental[]>("/api/rentals"),
        create: (dto: RentalDto): Promise<Rental> =>
            request<Rental>("/api/rentals", {
                method: "POST",
                body: JSON.stringify(dto)
            }),
        update: (id: number, dto: RentalDto): Promise<Rental> =>
            request<Rental>(`/api/rentals/${id}`, {
                method: "PUT",
                body: JSON.stringify(dto)
            }),
        delete: (id: number): Promise<void> =>
            request<void>(`/api/rentals/${id}`, {
                method: "DELETE"
            })
    }
};