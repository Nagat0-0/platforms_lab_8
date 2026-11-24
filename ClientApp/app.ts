import { api } from "./api.js";
import {
    Client,
    ClientDto,
    Product,
    ProductDto,
    Rental,
    RentalDto,
    TabType
} from "./types.js";

function getEl<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Element #${id} not found`);
    }
    return element as T;
}

const sectionTitle = getEl<HTMLHeadingElement>("section-title");
const addBtn = getEl<HTMLButtonElement>("add-btn");
const itemsList = getEl<HTMLDivElement>("items-list");
const toastContainer = getEl<HTMLDivElement>("toast-container");

const modalOverlay = getEl<HTMLDivElement>("modal-overlay");
const modalTitle = getEl<HTMLHeadingElement>("modal-title");
const modalCloseBtn = getEl<HTMLButtonElement>("modal-close-btn");
const modalForm = getEl<HTMLFormElement>("modal-form");
const modalFields = getEl<HTMLDivElement>("modal-fields");
const modalError = getEl<HTMLDivElement>("modal-error");
const modalSaveBtn = getEl<HTMLButtonElement>("modal-save-btn");
const modalCancelBtn = getEl<HTMLButtonElement>("modal-cancel-btn");

const confirmOverlay = getEl<HTMLDivElement>("confirm-overlay");
const confirmMessage = getEl<HTMLParagraphElement>("confirm-message");
const confirmYesBtn = getEl<HTMLButtonElement>("confirm-yes-btn");
const confirmNoBtn = getEl<HTMLButtonElement>("confirm-no-btn");

const tabButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".tab-btn"));

let activeTab: TabType = "clients";
let clients: Client[] = [];
let products: Product[] = [];
let rentals: Rental[] = [];
let editingId: number | null = null;
let confirmAction: (() => Promise<void>) | null = null;

function formatClientName(client: Client | null): string {
    if (!client) {
        return "Невідомий клієнт";
    }
    return [client.lastName, client.firstName, client.middleName]
        .filter((part): part is string => Boolean(part && part.trim()))
        .join(" ");
}

function formatMoney(value: number): string {
    return `${value.toFixed(2)} ₴`;
}

function formatDate(isoDate: string | null): string {
    if (!isoDate) {
        return "Не вказано";
    }
    const parts = isoDate.split("-");
    if (parts.length !== 3) {
        return isoDate;
    }
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function getTodayIso(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function showToast(message: string, type: "success" | "error"): void {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    window.setTimeout(() => {
        toast.remove();
    }, 3500);
}

function showModalError(message: string): void {
    modalError.textContent = message;
    modalError.classList.remove("hidden");
}

function clearModalError(): void {
    modalError.textContent = "";
    modalError.classList.add("hidden");
}

function createTextElement(tag: string, className: string, text: string): HTMLElement {
    const el = document.createElement(tag);
    el.className = className;
    el.textContent = text;
    return el;
}

function createFormInput(
    id: string,
    label: string,
    type: string,
    value: string,
    placeholder = "",
    step?: string
): HTMLDivElement {
    const group = document.createElement("div");
    group.className = "form-group";

    const labelEl = document.createElement("label");
    labelEl.className = "form-label";
    labelEl.htmlFor = id;
    labelEl.textContent = label;

    const input = document.createElement("input");
    input.className = "form-input";
    input.id = id;
    input.name = id;
    input.type = type;
    input.value = value;
    if (placeholder) {
        input.placeholder = placeholder;
    }
    if (step) {
        input.step = step;
    }

    group.append(labelEl, input);
    return group;
}

function createFormSelect(
    id: string,
    label: string,
    options: Array<{ value: string; text: string }>,
    selectedValue: string,
    placeholder: string
): HTMLDivElement {
    const group = document.createElement("div");
    group.className = "form-group";

    const labelEl = document.createElement("label");
    labelEl.className = "form-label";
    labelEl.htmlFor = id;
    labelEl.textContent = label;

    const select = document.createElement("select");
    select.className = "form-select";
    select.id = id;
    select.name = id;

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = placeholder;
    select.appendChild(defaultOption);

    for (const opt of options) {
        const optionEl = document.createElement("option");
        optionEl.value = opt.value;
        optionEl.textContent = opt.text;
        if (opt.value === selectedValue) {
            optionEl.selected = true;
        }
        select.appendChild(optionEl);
    }

    group.append(labelEl, select);
    return group;
}

function getInputValue(id: string): string {
    return (getEl<HTMLInputElement>(id).value ?? "").trim();
}

function parseNonNegativeNumber(raw: string): number | null {
    if (!raw) {
        return null;
    }
    const normalized = raw.replace(",", ".");
    const value = Number(normalized);
    if (!Number.isFinite(value) || value < 0) {
        return null;
    }
    return value;
}

function updateToolbar(): void {
    const config: Record<TabType, { title: string; button: string }> = {
        clients: { title: "Клієнти", button: "+ Додати клієнта" },
        products: { title: "Продукти", button: "+ Додати продукт" },
        rentals: { title: "Оренда", button: "+ Створити запис оренди" }
    };

    sectionTitle.textContent = config[activeTab].title;
    addBtn.textContent = config[activeTab].button;

    for (const btn of tabButtons) {
        btn.classList.toggle("active", btn.dataset.tab === activeTab);
    }
}

function createCardActions(onEdit: () => void, onDelete: () => void): HTMLDivElement {
    const actions = document.createElement("div");
    actions.className = "card-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn btn-edit";
    editBtn.textContent = "Редагувати";
    editBtn.addEventListener("click", onEdit);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn btn-delete";
    deleteBtn.textContent = "Видалити";
    deleteBtn.addEventListener("click", onDelete);

    actions.append(editBtn, deleteBtn);
    return actions;
}

function renderEmptyState(text: string): void {
    const empty = createTextElement("div", "empty-state", text);
    itemsList.appendChild(empty);
}

function renderClients(): void {
    if (clients.length === 0) {
        renderEmptyState("Список клієнтів порожній.");
        return;
    }

    for (const client of clients) {
        const card = document.createElement("div");
        card.className = "card";

        const content = document.createElement("div");
        content.className = "card-content";
        content.append(
            createTextElement("div", "card-title", formatClientName(client)),
            createTextElement("div", "card-meta", `Паспорт: ${client.passportNumber}`),
            createTextElement("div", "card-meta", `Адреса: ${client.address ?? "—"}`),
            createTextElement("div", "card-meta", `Тел: ${client.phone ?? "—"}`)
        );

        const actions = createCardActions(
            () => openClientModal(client),
            () => openConfirm(`Видалити клієнта ${client.lastName}?`, async () => {
                await api.clients.delete(client.id);
                await loadAllData();
                showToast("Клієнта видалено.", "success");
            })
        );

        card.append(content, actions);
        itemsList.appendChild(card);
    }
}

function renderProducts(): void {
    if (products.length === 0) {
        renderEmptyState("Список продуктів порожній.");
        return;
    }

    for (const product of products) {
        const card = document.createElement("div");
        card.className = "card";

        const content = document.createElement("div");
        content.className = "card-content";
        content.append(
            createTextElement("div", "card-title", product.title),
            createTextElement("div", "card-meta", product.description || "Без опису"),
            createTextElement("div", "card-meta text-emerald", `Вартість: ${formatMoney(product.cost)}`),
            createTextElement("div", "card-meta text-indigo", `Ціна за день: ${formatMoney(product.dailyRentalPrice)}`)
        );

        const actions = createCardActions(
            () => openProductModal(product),
            () => openConfirm(`Видалити продукт "${product.title}"?`, async () => {
                await api.products.delete(product.id);
                await loadAllData();
                showToast("Продукт видалено.", "success");
            })
        );

        card.append(content, actions);
        itemsList.appendChild(card);
    }
}

function renderRentals(): void {
    if (rentals.length === 0) {
        renderEmptyState("Список записів оренди порожній.");
        return;
    }

    for (const rental of rentals) {
        const card = document.createElement("div");
        card.className = "card";

        const clientName = rental.client
            ? `${rental.client.lastName} ${rental.client.firstName}`
            : `Клієнт #${rental.clientId}`;
        const productTitle = rental.product ? rental.product.title : `Продукт #${rental.productId}`;

        const content = document.createElement("div");
        content.className = "card-content";
        content.append(
            createTextElement("div", "card-title", clientName),
            createTextElement("div", "card-subtitle", `Продукт: ${productTitle}`),
            createTextElement("div", "card-meta text-emerald", `Дата видачі: ${formatDate(rental.issueDate)}`),
            createTextElement(
                "div",
                rental.returnDate ? "card-meta text-rose" : "card-meta",
                `Дата повернення: ${formatDate(rental.returnDate)}`
            )
        );

        const actions = createCardActions(
            () => openRentalModal(rental),
            () => openConfirm("Видалити цей запис оренди?", async () => {
                await api.rentals.delete(rental.id);
                await loadAllData();
                showToast("Запис оренди видалено.", "success");
            })
        );

        card.append(content, actions);
        itemsList.appendChild(card);
    }
}

function render(): void {
    updateToolbar();
    itemsList.innerHTML = "";

    if (activeTab === "clients") {
        renderClients();
    } else if (activeTab === "products") {
        renderProducts();
    } else {
        renderRentals();
    }
}

function openModalBase(title: string, id: number | null): void {
    editingId = id;
    modalTitle.textContent = title;
    modalFields.innerHTML = "";
    clearModalError();
    modalOverlay.classList.remove("hidden");
}

function closeModal(): void {
    modalOverlay.classList.add("hidden");
    editingId = null;
    clearModalError();
}

function openClientModal(client?: Client): void {
    openModalBase(client ? "Редагувати клієнта" : "Новий клієнт", client ? client.id : null);

    modalFields.append(
        createFormInput("client-lastname", "Прізвище *", "text", client?.lastName ?? "", "Введіть прізвище"),
        createFormInput("client-firstname", "Ім'я *", "text", client?.firstName ?? "", "Введіть ім'я"),
        createFormInput("client-middlename", "По батькові", "text", client?.middleName ?? "", "Введіть по батькові"),
        createFormInput("client-passport", "Номер паспорта *", "text", client?.passportNumber ?? "", "Введіть номер паспорта"),
        createFormInput("client-address", "Адреса", "text", client?.address ?? "", "Введіть адресу"),
        createFormInput("client-phone", "Телефон", "tel", client?.phone ?? "", "Введіть номер телефону")
    );
}

function openProductModal(product?: Product): void {
    openModalBase(product ? "Редагувати продукт" : "Новий продукт", product ? product.id : null);

    modalFields.append(
        createFormInput("product-title", "Назва *", "text", product?.title ?? "", "Введіть назву продукту"),
        createFormInput("product-description", "Опис", "text", product?.description ?? "", "Введіть опис"),
        createFormInput("product-cost", "Вартість (₴) *", "number", product ? String(product.cost) : "", "0.00", "0.01"),
        createFormInput("product-daily-price", "Ціна за день (₴) *", "number", product ? String(product.dailyRentalPrice) : "", "0.00", "0.01")
    );
}

function openRentalModal(rental?: Rental): void {
    openModalBase(rental ? "Редагувати оренду" : "Новий запис оренди", rental ? rental.id : null);

    const clientOptions = clients.map((c) => ({
        value: String(c.id),
        text: formatClientName(c)
    }));
    const productOptions = products.map((p) => ({
        value: String(p.id),
        text: p.title
    }));

    const hasReturnDate = Boolean(rental?.returnDate);
    const issueDateValue = rental?.issueDate ?? getTodayIso();
    const returnDateValue = rental?.returnDate ?? issueDateValue;

    const returnDateGroup = createFormInput("rental-return-date", "Дата повернення", "date", returnDateValue);
    returnDateGroup.classList.toggle("hidden", !hasReturnDate);

    const checkboxLabel = document.createElement("label");
    checkboxLabel.className = "checkbox-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = "rental-has-return-date";
    checkbox.checked = hasReturnDate;
    checkbox.addEventListener("change", () => {
        returnDateGroup.classList.toggle("hidden", !checkbox.checked);
    });

    const checkboxText = document.createElement("span");
    checkboxText.textContent = "Вказати дату повернення";
    checkboxLabel.append(checkbox, checkboxText);

    modalFields.append(
        createFormSelect(
            "rental-client",
            "Клієнт *",
            clientOptions,
            rental ? String(rental.clientId) : "",
            "Оберіть клієнта"
        ),
        createFormSelect(
            "rental-product",
            "Продукт *",
            productOptions,
            rental ? String(rental.productId) : "",
            "Оберіть продукт"
        ),
        createFormInput("rental-issue-date", "Дата видачі *", "date", issueDateValue),
        checkboxLabel,
        returnDateGroup
    );
}

function openConfirm(message: string, onConfirm: () => Promise<void>): void {
    confirmMessage.textContent = message;
    confirmAction = onConfirm;
    confirmOverlay.classList.remove("hidden");
}

function closeConfirm(): void {
    confirmOverlay.classList.add("hidden");
    confirmAction = null;
}

async function handleSaveClient(): Promise<void> {
    const lastName = getInputValue("client-lastname");
    const firstName = getInputValue("client-firstname");
    const middleName = getInputValue("client-middlename");
    const passportNumber = getInputValue("client-passport");
    const address = getInputValue("client-address");
    const phone = getInputValue("client-phone");

    if (!lastName || !firstName || !passportNumber) {
        showModalError("Прізвище, Ім'я та Паспорт є обов'язковими.");
        return;
    }

    const dto: ClientDto = {
        lastName,
        firstName,
        middleName: middleName || null,
        passportNumber,
        address: address || null,
        phone: phone || null
    };

    if (editingId === null) {
        await api.clients.create(dto);
        showToast("Клієнта додано.", "success");
    } else {
        await api.clients.update(editingId, dto);
        showToast("Дані клієнта оновлено.", "success");
    }

    closeModal();
    await loadAllData();
}

async function handleSaveProduct(): Promise<void> {
    const title = getInputValue("product-title");
    const description = getInputValue("product-description");
    const costRaw = getInputValue("product-cost");
    const dailyPriceRaw = getInputValue("product-daily-price");

    if (!title || !costRaw || !dailyPriceRaw) {
        showModalError("Назва, вартість та ціна за день є обов'язковими.");
        return;
    }

    const cost = parseNonNegativeNumber(costRaw);
    if (cost === null) {
        showModalError("Вартість має бути коректним невід'ємним числом.");
        return;
    }

    const dailyRentalPrice = parseNonNegativeNumber(dailyPriceRaw);
    if (dailyRentalPrice === null) {
        showModalError("Ціна за день має бути коректним невід'ємним числом.");
        return;
    }

    const dto: ProductDto = {
        title,
        description: description || null,
        cost,
        dailyRentalPrice
    };

    if (editingId === null) {
        await api.products.create(dto);
        showToast("Продукт додано.", "success");
    } else {
        await api.products.update(editingId, dto);
        showToast("Дані продукту оновлено.", "success");
    }

    closeModal();
    await loadAllData();
}

async function handleSaveRental(): Promise<void> {
    const clientIdRaw = getEl<HTMLSelectElement>("rental-client").value;
    const productIdRaw = getEl<HTMLSelectElement>("rental-product").value;
    const issueDate = getInputValue("rental-issue-date");
    const hasReturnDate = getEl<HTMLInputElement>("rental-has-return-date").checked;
    const returnDate = hasReturnDate ? getInputValue("rental-return-date") : null;

    if (!clientIdRaw || !productIdRaw) {
        showModalError("Оберіть клієнта та продукт.");
        return;
    }

    if (!issueDate) {
        showModalError("Вкажіть дату видачі.");
        return;
    }

    if (hasReturnDate) {
        if (!returnDate) {
            showModalError("Вкажіть дату повернення.");
            return;
        }
        if (returnDate < issueDate) {
            showModalError("Дата повернення не може бути раніше дати видачі.");
            return;
        }
    }

    const dto: RentalDto = {
        clientId: Number(clientIdRaw),
        productId: Number(productIdRaw),
        issueDate,
        returnDate
    };

    if (editingId === null) {
        await api.rentals.create(dto);
        showToast("Запис оренди створено.", "success");
    } else {
        await api.rentals.update(editingId, dto);
        showToast("Запис оренди оновлено.", "success");
    }

    closeModal();
    await loadAllData();
}

async function loadAllData(): Promise<void> {
    try {
        const [loadedClients, loadedProducts, loadedRentals] = await Promise.all([
            api.clients.getAll(),
            api.products.getAll(),
            api.rentals.getAll()
        ]);
        clients = loadedClients;
        products = loadedProducts;
        rentals = loadedRentals;
        render();
    } catch (error) {
        const message = error instanceof Error ? error.message : "Не вдалося завантажити дані.";
        showToast(message, "error");
    }
}

for (const btn of tabButtons) {
    btn.addEventListener("click", () => {
        const tab = btn.dataset.tab as TabType | undefined;
        if (!tab) {
            return;
        }
        activeTab = tab;
        render();
    });
}

addBtn.addEventListener("click", () => {
    if (activeTab === "clients") {
        openClientModal();
    } else if (activeTab === "products") {
        openProductModal();
    } else {
        openRentalModal();
    }
});

modalForm.addEventListener("submit", async (event: SubmitEvent) => {
    event.preventDefault();
    clearModalError();
    modalSaveBtn.disabled = true;

    try {
        if (activeTab === "clients") {
            await handleSaveClient();
        } else if (activeTab === "products") {
            await handleSaveProduct();
        } else {
            await handleSaveRental();
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "Сталася помилка при збереженні.";
        showModalError(message);
    } finally {
        modalSaveBtn.disabled = false;
    }
});

modalCloseBtn.addEventListener("click", closeModal);
modalCancelBtn.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (event: MouseEvent) => {
    if (event.target === modalOverlay) {
        closeModal();
    }
});

confirmNoBtn.addEventListener("click", closeConfirm);
confirmOverlay.addEventListener("click", (event: MouseEvent) => {
    if (event.target === confirmOverlay) {
        closeConfirm();
    }
});

confirmYesBtn.addEventListener("click", async () => {
    if (!confirmAction) {
        return;
    }
    const action = confirmAction;
    confirmYesBtn.disabled = true;
    try {
        await action();
        closeConfirm();
    } catch (error) {
        const message = error instanceof Error ? error.message : "Помилка при видаленні.";
        closeConfirm();
        showToast(message, "error");
    } finally {
        confirmYesBtn.disabled = false;
    }
});

document.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Escape") {
        if (!confirmOverlay.classList.contains("hidden")) {
            closeConfirm();
        } else if (!modalOverlay.classList.contains("hidden")) {
            closeModal();
        }
    }
});

void loadAllData();