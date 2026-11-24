async function request(url, options) {
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
            const errorBody = (await response.json());
            if (errorBody.message) {
                message = errorBody.message;
            }
            else if (errorBody.title) {
                message = errorBody.title;
            }
        }
        catch {
            // ignore non-json error body
        }
        throw new Error(message);
    }
    if (response.status === 204) {
        return undefined;
    }
    return (await response.json());
}
export const api = {
    clients: {
        getAll: () => request("/api/clients"),
        create: (dto) => request("/api/clients", {
            method: "POST",
            body: JSON.stringify(dto)
        }),
        update: (id, dto) => request(`/api/clients/${id}`, {
            method: "PUT",
            body: JSON.stringify(dto)
        }),
        delete: (id) => request(`/api/clients/${id}`, {
            method: "DELETE"
        })
    },
    products: {
        getAll: () => request("/api/products"),
        create: (dto) => request("/api/products", {
            method: "POST",
            body: JSON.stringify(dto)
        }),
        update: (id, dto) => request(`/api/products/${id}`, {
            method: "PUT",
            body: JSON.stringify(dto)
        }),
        delete: (id) => request(`/api/products/${id}`, {
            method: "DELETE"
        })
    },
    rentals: {
        getAll: () => request("/api/rentals"),
        create: (dto) => request("/api/rentals", {
            method: "POST",
            body: JSON.stringify(dto)
        }),
        update: (id, dto) => request(`/api/rentals/${id}`, {
            method: "PUT",
            body: JSON.stringify(dto)
        }),
        delete: (id) => request(`/api/rentals/${id}`, {
            method: "DELETE"
        })
    }
};
