
const STORAGE_KEY = "moniMiaDatos";

let budget = {
  name: "",
  income: 0,
  expenses: [],
  goal: null
};

const currency = new Intl.NumberFormat("es-EC", {
  style: "currency",
  currency: "USD"
});

function formatMoney(amount) {
  return currency.format(Number(amount) || 0);
}

// Guardar los datos en el navegador
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(budget));
}

// Recuperar los datos guardados
function loadData() {
  const savedData = localStorage.getItem(STORAGE_KEY);

  if (savedData) {
    try {
      const data = JSON.parse(savedData);

      budget = {
        name: data.name || "",
        income: Number(data.income) || 0,
        expenses: Array.isArray(data.expenses) ? data.expenses : [],
        goal: data.goal || null
      };
    } catch (error) {
      console.error("Error al recuperar los datos:", error);
    }
  }
}

// Calcular el total de gastos
function getTotalExpenses() {
  return budget.expenses.reduce(
    (total, expense) => total + Number(expense.amount),
    0
  );
}

// Calcular el ahorro registrado
function getTotalSavings() {
  return budget.goal ? Number(budget.goal.saved) || 0 : 0;
}

// Actualizar el resumen financiero
function updateSummary() {
  const totalExpenses = getTotalExpenses();
  const savings = getTotalSavings();
  const available = budget.income - totalExpenses - savings;

  document.getElementById("summaryIncome").textContent =
    formatMoney(budget.income);

  document.getElementById("summaryExpenses").textContent =
    formatMoney(totalExpenses);

  document.getElementById("summarySavings").textContent =
    formatMoney(savings);

  const availableElement = document.getElementById("summaryAvailable");

  availableElement.textContent = formatMoney(available);
  availableElement.classList.toggle("negative", available < 0);
}

// Mostrar mensajes debajo del formulario de presupuesto
function showBudgetMessage(message, isError = false) {
  const messageElement = document.getElementById("formMessage");

  messageElement.textContent = message;
  messageElement.classList.toggle("error", isError);
}

 // Enviar el formulario de contacto al backend
async function sendContactMessage(event) {
  event.preventDefault();

  const form = document.getElementById("contactMessageForm");
  const status = document.getElementById("contactMessageStatus");
  const button = form.querySelector('button[type="submit"]');

  const contacto = {
    nombre: document.getElementById("contactName").value.trim(),
    correo: document.getElementById("contactEmail").value.trim(),
    mensaje: document.getElementById("contactMessage").value.trim()
  };

  //verificar que ningun campo esté vacío
  if (!contacto.nombre || !contacto.correo || !contacto.mensaje) {
    status.textContent = "Por favor, completa todos los campos.";
    return;
  }

  button.disabled = true;
  status.textContent = "Enviando tu mensaje...";

  try {
    const response = await fetch("https://moni-mia-backend.onrender.com/api/contactos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(contacto)
    });

    const resultado = await response.json();

    if (!response.ok) {
      throw new Error(resultado.mensaje || "No se pudo enviar el mensaje.");
    }

    status.textContent = resultado.mensaje;
    form.reset();

  } catch (error) {
    console.error("Error al enviar el mensaje:", error);
    status.textContent =
      "No se pudo enviar el mensaje. Verifica que el servidor esté funcionando e inténtalo de nuevo.";
  } finally {
    button.disabled = false;
  }
}


// Registrar el nombre y los ingresos
function saveBudgetForm() {
  const name = document.getElementById("name").value.trim();
  const incomeInput = document.getElementById("monthlyIncome");
  const income = Number(incomeInput.value);

  if (name === "") {
    showBudgetMessage("Por favor, escribe tu nombre.", true);
    return;
  }

  if (incomeInput.value.trim() === "" || !Number.isFinite(income) || income < 0) {
    showBudgetMessage("Ingresa un ingreso válido.", true);
    return;
  }

  budget.name = name;
  budget.income = income;

  saveData();
  updatePage();

  showBudgetMessage(
    `¡Listo, ${name}! Tu presupuesto se guardó correctamente.`
  );
}

// Registrar un gasto nuevo
function addExpense() {
  const categoryInput = document.getElementById("expenseCategory");
  const amountInput = document.getElementById("expenseAmount");

  const category = categoryInput.value;
  const amount = Number(amountInput.value);

  if (!category) {
    alert("Selecciona una categoría.");
    return;
  }

  if (amountInput.value.trim() === "" || !Number.isFinite(amount) || amount <= 0) {
    alert("Ingresa un monto mayor que cero.");
    return;
  }

  budget.expenses.push({
    id: Date.now().toString() + Math.random().toString(16).slice(2),
    category: category,
    amount: amount
  });

  saveData();
  updatePage();

  document.getElementById("expenseForm").reset();

  alert("¡Gasto registrado correctamente!");
}

// Traducir los nombres de las categorías
function categoryName(category) {
  const categories = {
    alimentacion: "Alimentación",
    transporte: "Transporte",
    universidad: "Universidad",
    entretenimiento: "Entretenimiento",
    compras: "Compras",
    otros: "Otros"
  };

  return categories[category] || "Otros";
}

// Mostrar los gastos en el panel lateral
function renderExpensesPanel() {
  const cartCount = document.getElementById("cartCount");
  const cartItems = document.getElementById("cartItems");

  cartCount.textContent = budget.expenses.length;
  cartItems.replaceChildren();

  if (budget.expenses.length === 0) {
    const message = document.createElement("p");
    message.textContent = "Todavía no has registrado gastos.";
    cartItems.appendChild(message);
    return;
  }

  budget.expenses.forEach((expense) => {
    const item = document.createElement("div");
    item.className = "cart-item";

    const description = document.createElement("span");
    description.textContent =
      `${categoryName(expense.category)}: ${formatMoney(expense.amount)}`;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Eliminar";

    deleteButton.addEventListener("click", () => {
      budget.expenses = budget.expenses.filter(
        (registeredExpense) => registeredExpense.id !== expense.id
      );

      saveData();
      updatePage();
    });

    item.append(description, deleteButton);
    cartItems.appendChild(item);
  });
}

// Mostrar el progreso de la meta de ahorro

function updateGoalProgress() {
  const goalForm = document.querySelector("#goalForm");
  let box = document.querySelector("#goalProgressBox");

  if (!box) {
    box = document.createElement("div");
    box.id = "goalProgressBox";
    box.className = "goal-progress-box";
    goalForm.insertAdjacentElement("afterend", box);
  }

  if (!budget.goal) {
    box.innerHTML = `
      <p>Crea una meta de ahorro para comenzar a registrar tus aportes.</p>
    `;
    return;
  }

  const target = Number(budget.goal.target) || 0;
  const saved = Number(budget.goal.saved) || 0;

  const percent = target > 0
    ? Math.min((saved / target) * 100, 100)
    : 0;

  box.innerHTML = `
    <h3>${budget.goal.name}</h3>
    <p>Meta: ${formatMoney(target)}</p>
    <p>Ahorrado: ${formatMoney(saved)}</p>
    <p>Te faltan: ${formatMoney(Math.max(target - saved, 0))}</p>

    <div class="goal-progress-track">
      <div class="goal-progress-fill"
           style="width: ${percent}%"></div>
    </div>

    <p><strong>${percent.toFixed(1)}%</strong> de tu meta alcanzada</p>

    ${
      saved >= target && target > 0
        ? "<p>¡Felicidades! Alcanzaste tu meta. 🎉</p>"
        : `
          <form id="contributionForm">
            <label for="contributionAmount">
              ¿Cuánto ahorraste hoy?
            </label>

            <input
              type="number"
              id="contributionAmount"
              min="0.01"
              step="0.01"
              placeholder="Ej. 10.00"
              required
            >

            <button type="submit" id="addContributionButton">
              Registrar ahorro
            </button>
          </form>
        `
    }
  `;

  const contributionForm = document.querySelector("#contributionForm");

  if (contributionForm) {
    contributionForm.addEventListener("submit", function(event) {
      event.preventDefault();

      const input = document.querySelector("#contributionAmount");
      const amount = Number(input.value);

      if (!Number.isFinite(amount) || amount <= 0) {
        alert("Ingresa un monto mayor que cero.");
        return;
      }
      
      const restante = Number(budget.goal.target) - Number(budget.goal.saved);
      
      if (amount > restante) {
        alert(`Solo necesitas ${formatMoney(restante)} para completar tu meta.`);
        return;
      }
      
      budget.goal.saved = (Number(budget.goal.saved) || 0) + amount;
      
      saveData();
      updatePage();

      alert("¡Tu aporte se registró correctamente!");
    });
  }
}


// Actualizar todas las partes de la página
function updatePage() {
  updateSummary();
  renderExpensesPanel();
  updateGoalProgress();
  updateExpenseChart();
}

// Crear una meta de ahorro

function saveGoal() {
  const name = document.querySelector("#goalName").value.trim();
  const target = Number(document.querySelector("#goalTarget").value);

  if (!name || !Number.isFinite(target) || target <= 0) {
    alert("Ingresa un nombre y una meta mayor que cero.");
    return;
  }

  budget.goal = {
    name: name,
    target: target,
    saved: 0
  };

  saveData();
  updatePage();

  alert("¡Tu meta de ahorro está creada! Ya puedes registrar tus aportes.");
}


// Abrir el resumen lateral
function openPanel() {
  document.getElementById("cartPanel").classList.add("open");
  document.getElementById("overlay").classList.add("show");
  document.getElementById("cartPanel").setAttribute("aria-hidden", "false");
}

// Cerrar el resumen lateral
function closePanel() {
  document.getElementById("cartPanel").classList.remove("open");
  document.getElementById("overlay").classList.remove("show");
  document.getElementById("cartPanel").setAttribute("aria-hidden", "true");
}

// Configurar los botones y formularios
function connectEvents() {
    // Conectar el formulario de contacto con el backend
  document.getElementById("contactMessageForm").addEventListener(
    "submit",
    sendContactMessage
  );
  // Conectar el asistente financiero
  document.getElementById("aiChatForm").addEventListener(
    "submit",
    sendAIMessage
  );
  // Abrir y cerrar el chatbot
document.getElementById("aiChatToggle").addEventListener("click", () => {
  document.getElementById("aiChatPanel").classList.add("open");
  document.getElementById("aiChatToggle").style.display = "none";
  document.getElementById("aiChatInput").focus();
});

document.getElementById("aiChatClose").addEventListener("click", () => {
  document.getElementById("aiChatPanel").classList.remove("open");
  document.getElementById("aiChatToggle").style.display = "block";
});
  document.getElementById("saveBudgetButton").addEventListener("click", saveBudgetForm);

  document.getElementById("contactForm").addEventListener("submit", (event) => {
    event.preventDefault();
    saveBudgetForm();
  });

  document.getElementById("addExpenseButton").addEventListener("click", addExpense);

  document.getElementById("expenseForm").addEventListener("submit", (event) => {
    event.preventDefault();
    addExpense();
  });

  document.getElementById("createGoalButton").addEventListener("click", saveGoal);

  document.getElementById("goalForm").addEventListener("submit", (event) => {
    event.preventDefault();
    saveGoal();
  });

  // Botones de las categorías
  document.querySelectorAll(".expense-add-btn").forEach((button) => {
    button.addEventListener("click", () => {
      document.getElementById("expenseCategory").value = button.dataset.category;

      document.getElementById("registrar-gasto").scrollIntoView({
        behavior: "smooth"
      });

      document.getElementById("expenseAmount").focus();
    });
  });

  // Filtros de las categorías
  const filterButtons = document.querySelectorAll(".filter-btn");
  const cards = document.querySelectorAll("#menuGrid .product-card");

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");

      const group = button.dataset.group || "all";

      cards.forEach((card) => {
        const matches = group === "all" || card.dataset.group === group;
        card.classList.toggle("hidden", !matches);
      });
    });
  });

  // Panel de resumen
  document.getElementById("cartButton").addEventListener("click", openPanel);
  document.getElementById("closeCart").addEventListener("click", closePanel);
  document.getElementById("overlay").addEventListener("click", closePanel);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePanel();
  });

  // Eliminar todos los gastos
  document.getElementById("clearCart").addEventListener("click", () => {
    if (budget.expenses.length === 0) {
      alert("No tienes gastos registrados.");
      return;
    }

    if (confirm("¿Deseas eliminar todos los gastos?")) {
      budget.expenses = [];
      saveData();
      updatePage();
    }
  });

  // Menú para celulares
  const menuToggle = document.getElementById("menuToggle");
  const navLinks = document.getElementById("navLinks");

  menuToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.textContent = isOpen ? "✕" : "☰";
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.textContent = "☰";
    });
  });

  document.getElementById("year").textContent = new Date().getFullYear();
}

function updateExpenseChart() {
  const donut = document.querySelector("#expenseDonut");
  const legend = document.querySelector("#expenseLegend");
  const totalElement = document.querySelector("#chartTotal");

  if (!donut || !legend || !totalElement) return;

  const colors = [
    "#355C4A",
    "#8FAF9A",
    "#D98C9A",
    "#D9B879",
    "#8B9DC3",
    "#C49AC4",
    "#E69A69",
    "#76A9A0"
  ];

  const totals = {};

  budget.expenses.forEach(expense => {
    const category = expense.category || "Otros";
    totals[category] = (totals[category] || 0) +
      (Number(expense.amount) || 0);
  });

  const entries = Object.entries(totals)
    .filter(([, amount]) => amount > 0);

  const total = entries.reduce((sum, [, amount]) => sum + amount, 0);

  totalElement.textContent = formatMoney(total);

  if (total === 0) {
    donut.style.background =
      "conic-gradient(#E3E8E3 0% 100%)";

    legend.innerHTML = "<p>Aún no tienes gastos registrados.</p>";
    return;
  }

  let accumulated = 0;

  const segments = entries.map(([category, amount], index) => {
    const start = accumulated;
    accumulated += (amount / total) * 100;

    return `${colors[index % colors.length]} ${start}% ${accumulated}%`;
  });

  donut.style.background =
    `conic-gradient(${segments.join(", ")})`;

  legend.innerHTML = entries.map(([category, amount], index) => {
    const percentage = (amount / total) * 100;

    return `
      <div class="expense-legend-item">
        <span
          class="expense-legend-color"
          style="background-color: ${colors[index % colors.length]}"
        ></span>

        <span>${category}</span>

        <strong>${percentage.toFixed(1)}%</strong>
        <span>${formatMoney(amount)}</span>
      </div>
    `;
  }).join("");
}

// Iniciar la página
loadData();

document.addEventListener("DOMContentLoaded", () => {
  if (budget.name) {
    document.getElementById("name").value = budget.name;
  }

  if (budget.income > 0) {
    document.getElementById("monthlyIncome").value = budget.income;
  }

  if (budget.goal) {
    document.getElementById("goalName").value = budget.goal.name || "";
    document.getElementById("goalTarget").value = budget.goal.target || "";
    document.getElementById("goalSaved").value = budget.goal.saved || 0;
  }

  connectEvents();
  updatePage();
});



// ASISTENTE FINANCIERO DE MONI MIA

async function sendAIMessage(event) {
  event.preventDefault();

  const input = document.getElementById("aiChatInput");
  const messages = document.getElementById("aiChatMessages");
  const button = document.getElementById("aiChatSend");

  const pregunta = input.value.trim();

  if (!pregunta) return;

  // Mostrar la pregunta del usuario
  const userMessage = document.createElement("p");
  userMessage.className = "ai-user-message";
  userMessage.textContent = pregunta;
  messages.appendChild(userMessage);

  input.value = "";
  button.disabled = true;

  const loadingMessage = document.createElement("p");
  loadingMessage.textContent = "Moni Mia está pensando...";
  messages.appendChild(loadingMessage);

  try {
    const response = await fetch(
      "https://moni-mia-backend.onrender.com/api/ia/asistente",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ pregunta })
      }
    );

    const resultado = await response.json();

    if (!response.ok) {
      throw new Error(resultado.mensaje || "No se pudo obtener una respuesta.");
    }

    loadingMessage.textContent = resultado.respuesta;

  } catch (error) {
    console.error("Error en el asistente:", error);
    loadingMessage.textContent =
      "No pude responder en este momento. Inténtalo nuevamente.";
  } finally {
    button.disabled = false;
    input.focus();
  }
}
