import { forms } from "./forms.js";

function getUUIDFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("uuid");
}


let userMock = {};
async function fetchUserData(uuid) {
  const app = document.getElementById("app");
  app.style.display = "none";

  try {
    const response = await axios.get(
      `https://backend-develop-8a00.up.railway.app/api/annexes/get-fatca-info-by-uuid/${uuid}/`
    );

    if (response.status === 200) {
      const userData = response.data;

      userMock = {
        uuid: userData.uuid,
        fullname: userData.fullname,
        dpi: userData.dpi,
        id_asociado: userData.id_asociado,
        location: userData.location,
        form_req: userData.form_req || [],
      };
      window.userMock = userMock;

      initialize();
      setTimeout(() => {
        app.style.display = "block";
      }, 1);
    }
  } catch (error) {
    const errorMessage = error.response.data.error;
    app.style.display = "block";
    renderErrorPage(errorMessage);

  }
}

// Renderizar una página de error con un mensaje y un ícono
function renderErrorPage(message) {
  const app = document.getElementById("app"); // Asegúrate de que existe un elemento con id 'app'
  if (!app) {
    console.error('Elemento con id "app" no encontrado en el DOM.');
    return;
  }
  app.innerHTML = `
        <div class="flex items-center justify-center h-screen bg-blanco oscuro:bg-gris-900">
                <div class="py-8 px-4 mx-auto max-w-screen-xl lg:py-16 lg:px-6">
                    <div class="mx-auto max-w-screen-sm text-center">
                        <p class="mb-4 text-3xl tracking-tight font-bold text-blue-900 md:text-4xl text-blue-900">Ups! Algo salió mal.</p>
                        <p class="mb-4 text-lg font-light text-gray-500 dark:text-gray-400">Error: ${message}</p>
                       <button id="retry-button" class="w-full bg-blue-900 text-white py-3 rounded-lg font-medium flex items-center justify-center">Reintentar</button>
                    </div>
                </div>
        </div>
    `;

  // Agregar evento al botón de reintentar
  const retryButton = document.getElementById("retry-button");
  if (retryButton) {
    retryButton.addEventListener("click", () => {
      location.reload(); // Recargar la página
    });
  }
}

let currentForm = 0;
let currentQuestion = 0;
const answers = {}; // Almacena respuestas por formulario
const signatures = {}; // Almacena firmas por formulario

// Variables para la firma
let signaturePad;
const signatureSection = document.getElementById("signature-section");
const signaturePadCanvas = document.getElementById("signature-pad");
const clearSignatureButton = document.getElementById("clear-signature");
const submitFormButton = document.getElementById("submit-form");
const btnAnteriorSignature = document.getElementById("btn-anterior-signature");

// Elementos del DOM
const elements = {
  userName: document.getElementById("user-name"),
  userId: document.getElementById("user-id"),
  userLocation: document.getElementById("user-location"),
  formNumber: document.getElementById("form-number"),
  questionSection: document.getElementById("question-section"),
  signatureSection: document.getElementById("signature-section"),
  btnSiguiente: document.getElementById("btn-siguiente"),
  btnAnterior: document.getElementById("btn-anterior"),
};

// Inicializar el formulario
function initialize() {
  // Verificar si userMock está definido antes de continuar
  if (!userMock || !userMock.form_req) {
    console.error("userMock o userMock.form_req no están definidos.");
    return; // Detener la inicialización si no está definido
  }

  elements.userName.textContent = userMock.fullname ?? "";
  elements.userId.textContent = userMock.id_asociado ?? "";
  elements.userLocation.textContent = userMock.location ?? "";

  // Filtrar formularios según form_req
  const formulariosFiltrados = filtrarFormularios();

  if (formulariosFiltrados.length > 0) {
    loadForm();
  } else {
    console.error("No hay formularios disponibles para el usuario.");
  }

  setupEventListeners();
  cargarDatosLocalStorage();
  actualizarInterfazSegunEstado();
}

// Cargar datos desde el Local Storage
function cargarDatosLocalStorage() {
  const savedAnswers = localStorage.getItem("answers");
  const savedSignatures = localStorage.getItem("signatures");
  if (savedAnswers) {
    Object.assign(answers, JSON.parse(savedAnswers));
  }
  if (savedSignatures) {
    Object.assign(signatures, JSON.parse(savedSignatures));
  }
}

// Guardar datos en el Local Storage
function guardarDatosLocalStorage() {
  localStorage.setItem("answers", JSON.stringify(answers));
  localStorage.setItem("signatures", JSON.stringify(signatures));
}

// Filtrar formularios según el userMock
function filtrarFormularios() {
  // Verificar si userMock y userMock.form_req están definidos
  if (!userMock || !Array.isArray(userMock.form_req)) {
    console.error(
      "userMock o userMock.form_req no están definidos o no es un arreglo."
    );
    return []; // Retornar un arreglo vacío si no están definidos
  }
  const formulariosFiltrados = forms.filter((form) =>
    userMock.form_req.includes(form.form_no)
  );

  return formulariosFiltrados;
}

// Cargar un formulario específico
function loadForm() {
  const formulariosFiltrados = filtrarFormularios();
  if (formulariosFiltrados.length === 0) {
    console.error("No hay formularios disponibles para el usuario.");
    return;
  }
  const form = formulariosFiltrados[currentForm];
  elements.formNumber.textContent = `Formulario ${currentForm + 1}/${
    formulariosFiltrados.length
  }`;
  document.getElementById("form-title").textContent = form.title;
  currentQuestion = 0;
  loadQuestion();
  toggleButtonVisibility();
}

// Cargar una pregunta específica
function loadQuestion() {
  const question = forms[currentForm].questions[currentQuestion];

  // Verificar si la pregunta es de tipo "pdf"
  if (question.type === "pdf") {
    elements.questionSection.innerHTML = `
                <div class="bg-blue-50 p-4 rounded-lg">
                    <p class="text-blue-900 text-lg font-regular mb-2">${question.text}</p>
                    <iframe src="${question.src || './W8BEN.pdf'}" width="100%" height="600px" style="border: none;"></iframe>
                </div>
            `;

    // Agregar evento al checkbox
    const termsCheckbox = document.getElementById("terms-checkbox");
    if (termsCheckbox) {
        termsCheckbox.addEventListener("change", () => {
            const pdfContainer = document.getElementById("pdf-container");
            if (termsCheckbox.checked) {
                pdfContainer.style.display = "block"; // Mostrar el PDF
                elements.btnSiguiente.disabled = false; // Habilitar el botón "Siguiente"
            } else {
                pdfContainer.style.display = "none"; // Ocultar el PDF
                elements.btnSiguiente.disabled = true; // Deshabilitar el botón "Siguiente"
            }
        });
    }
  } else {
    const questionHTML = generateQuestionHTML(question);
    elements.questionSection.innerHTML = `
                <h2 class="text-[#00457C] font-medium font-semibold">Pregunta ${
                  currentQuestion + 1
                }/${forms[currentForm].questions.length}</h2>
                ${questionHTML}
            `;
    // Rellenar la respuesta si ya existe
    if (
      answers[currentForm] &&
      answers[currentForm][currentQuestion] !== undefined
    ) {
      const respuesta = answers[currentForm][currentQuestion];
      if (question.type === "radio") {
        const radioButtons = document.getElementsByName(
          `question-${currentForm}-${currentQuestion}`
        );
        radioButtons.forEach((rb) => {
          if (rb.value === respuesta) {
            rb.checked = true;
          }
        });
      } else if (question.type === "input") {
        const inputField = elements.questionSection.querySelector("input");
        inputField.value = respuesta;
      }
    }
    elements.signatureSection.style.display = "none"; // Asegurar que la sección de firma esté oculta
    elements.btnAnterior.style.display = "flex"; // Mostrar botón "Anterior" principal
    btnAnteriorSignature.style.display = "none"; // Ocultar botón "Anterior" de firma
    checkNextButton();
    toggleButtonVisibility();
  }
}

// Generar HTML dinámico para una pregunta
function generateQuestionHTML(question) {
  if (question.type === "radio") {
    return `
                <div class="bg-blue-50 p-4 rounded-lg">
                    <p class="text-[#00457C] text-lg font-regular">${question.text}</p>
                </div>
                <div class="flex gap-4 mt-4">
                    ${question.options
                      .map(
                        (option) => `
                        <label class="flex-1 cursor-pointer">
                            <input type="radio" name="question-${currentForm}-${currentQuestion}" value="${option}" class="hidden peer" ${
                          answers[currentForm]?.[currentQuestion] === option
                            ? "checked"
                            : ""
                        }>
                            <div class="text-center p-3 rounded-lg border-2 text-gray-400 peer-checked:bg-green-500 transition duration-300 peer-checked:text-white ${
                          answers[currentForm]?.[currentQuestion] === option ?  "bg-white text-gray-400" : "bg-white text-gray-400"
                        }">
                                <span class="font-semibold flex items-center justify-center">
                                    ${option}
                                </span>
                            </div>
                        </label>
                    `
                      )
                      .join("")}
                </div>
            `;
  } else if (question.type === "input") {
    return `
                <div class="bg-blue-50 p-4 rounded-lg">
                    <p class="class="text-[#00457C] text-md font-bold ">${
                      question.text
                    }</p>
                    <input type="text" class="mt-2 p-2 border border-gray-300 rounded-lg w-full" value="${
                      answers[currentForm]?.[currentQuestion] || ""
                    }" />
                </div>
            `;
  } else if (question.type === "terms") {
    return `
                <div class="bg-blue-50 p-4 rounded-lg">
                    <p class="text-[#00457C] text-md font-bold mb-2">${question.text}</p>
                    <div id="terms-container" class="h-32 overflow-y-scroll border p-2 rounded-lg">
                        <p style="text-align: justify;" class="text-black">
                            Con motivo de la Ley Sobre el Cumplimiento Fiscal Relativa a Cuentas en el Extranjero (US Foreign Account Tax Compliance Act, FATCA) YO: ${userMock.fullname}, declaro que conozco, acepto y autorizo expresamente y con pleno consentimiento a "Cooperativa ACREDICOM, R.L., (la Cooperativa), para que reporte y divulgue todo tipo de información sobre mi persona, mi información financiera y los detalles sobre mis operaciones con la Cooperativa(activas y pasivas), en virtud de cualquier requerimiento realizado por entidades locales y extranjeras dentro del marco de la normativa FATCA. Autorizo a la Cooperativa para que realice los reportes necesarios y revele información sobre mi identidad y mis depósitos cuando la Cooperativa en forma unilateral lo considere oportuno. Para que la Cooperativa pueda cumplir a cabalidad con la normativa FATCA, y de conformidad con el artículo 19 del Decreto 2-89, Ley del Organismo Judicial, renuncio a mi derecho de accionar en contra de "Cooperativa ACREDICOM, R.L." por revelar información que pueda catalogarse con carácter confidencial conforme las normas vigentes en la República de Guatemala; en consecuencia libero a "Cooperativa ACREDICOM, R.L." sus Directivos, Gerentes, Representantes Legales, Funcionarios y Empleados de cualquier responsabilidad civil y penal que pudieran derivarse del cumplimiento de la normativa FATCA. Declaro que entiendo que si por cualquier motivo decido no compartir la información anteriormente especificada, dicha negativa podría implicar que la Cooperativa cierre en forma inmediata mis cuentas, servicios y/o productos financieros contratados en la Cooperativa y la cancelación y/o suspensión de remesas, depósitos, pagos, compensaciones, accesos a servicios por medio de páginas web y/o servicios financieros móviles y cualquier otro servicio que la Cooperativa me pudiera estar prestando, sin responsabilidad alguna para la Cooperativa.
                        </p>
                    </div>
                    <div class="mt-4 flex items-center">
                        <input type="checkbox" id="terms-checkbox" class="mr-2">
                        <label for="terms-checkbox" class=" text-[#00457C] text-md font-bold">Acepto los términos y condiciones</label>
                    </div>
                </div>
            `;
  } else if (question.type === "terms-micoopeEnLinea") {
    return `
                <div class="bg-blue-50 p-4 rounded-lg">
                    <p class="text-[#00457C] text-md font-bold mb-2">${question.text}</p>
                    <div id="terms-container" class="h-32 overflow-y-scroll border p-2 rounded-lg">
                        <p style="text-align: justify;" class="text-black">
                            Con motivo de la Ley Sobre el Cumplimiento Fiscal Relativa a Cuentas en el Extranjero (US Foreign Account Tax Compliance Act, FATCA) YO: ${userMock.fullname}, declaro que conozco, acepto y autorizo expresamente y con pleno consentimiento a "Cooperativa ACREDICOM, R.L., (la Cooperativa), para que reporte y divulgue todo tipo de información sobre mi persona, mi información financiera y los detalles sobre mis operaciones con la Cooperativa(activas y pasivas), en virtud de cualquier requerimiento realizado por entidades locales y extranjeras dentro del marco de la normativa FATCA. Autorizo a la Cooperativa para que realice los reportes necesarios y revele información sobre mi identidad y mis depósitos cuando la Cooperativa en forma unilateral lo considere oportuno. Para que la Cooperativa pueda cumplir a cabalidad con la normativa FATCA, y de conformidad con el artículo 19 del Decreto 2-89, Ley del Organismo Judicial, renuncio a mi derecho de accionar en contra de "Cooperativa ACREDICOM, R.L." por revelar información que pueda catalogarse con carácter confidencial conforme las normas vigentes en la República de Guatemala; en consecuencia libero a "Cooperativa ACREDICOM, R.L." sus Directivos, Gerentes, Representantes Legales, Funcionarios y Empleados de cualquier responsabilidad civil y penal que pudieran derivarse del cumplimiento de la normativa FATCA. Declaro que entiendo que si por cualquier motivo decido no compartir la información anteriormente especificada, dicha negativa podría implicar que la Cooperativa cierre en forma inmediata mis cuentas, servicios y/o productos financieros contratados en la Cooperativa y la cancelación y/o suspensión de remesas, depósitos, pagos, compensaciones, accesos a servicios por medio de páginas web y/o servicios financieros móviles y cualquier otro servicio que la Cooperativa me pudiera estar prestando, sin responsabilidad alguna para la Cooperativa.
                        </p>
                    </div>
                    <div class="mt-4 flex items-center">
                        <input type="checkbox" id="terms-checkbox" class="mr-2">
                        <label for="terms-checkbox" class=" text-[#00457C] text-md font-bold">Acepto los términos y condiciones</label>
                    </div>
                </div>
            `;
  } else if (question.type === "pdf") {
    return `
                <div class="bg-blue-50 p-4 rounded-lg">
                    <p class="text-[#00457C] text-lg font-regular mb-2">${question.text}</p>
                    <iframe src="${question.src || './W8BEN.pdf'}" width="100%" height="600px" style="border: none;"></iframe>
                </div>
            `;
  } else if (question.type === "date") {
    return `
                <div class="bg-blue-50 p-4 rounded-lg">
                    <p class="text-[#00457C] text-lg font-regular">${
                      question.text
                    }</p>
                    <input type="date" class="mt-2 p-2 border border-gray-300 rounded-lg w-full" value="${
                      answers[currentForm]?.[currentQuestion] || ""
                    }" />
                </div>
            `;
  }
}

// Actualizar la respuesta en el objeto de respuestas
function updateAnswer(value) {
  if (!answers[currentForm]) {
    answers[currentForm] = {};
  }
  answers[currentForm][currentQuestion] = value;
  guardarDatosLocalStorage();
  checkNextButton();
}

// Verificar si el botón "Siguiente" debe estar habilitado
function checkNextButton() {
  const currentQuestionType =
    forms[currentForm].questions[currentQuestion].type;
  if (currentQuestionType === "terms") {
    const isChecked = answers[currentForm]?.[currentQuestion] === "Acepto";
    elements.btnSiguiente.disabled = !isChecked;
  } else {
    elements.btnSiguiente.disabled = !answers[currentForm]?.[currentQuestion];
  }
}

// Manejar clic en "Siguiente"
function handleNextClick() {
  const form = forms[currentForm];
  if (currentQuestion < form.questions.length - 1) {
    currentQuestion++;
    loadQuestion();
  } else {
    // Mostrar la sección de firma
    showSignatureSection();
  }
}

// Manejar clic en "Anterior"
function handlePreviousClick() {
  if (signatureSection.style.display === "block") {
    hideSignatureSection();
  } else {
    if (currentQuestion > 0) {
      currentQuestion--;
      loadQuestion();
    } else if (currentForm > 0) {
      currentForm--;
      loadForm();
    }
  }
}

// Manejar clic en "Anterior" de la firma
function handleAnteriorSignatureClick() {
  hideSignatureSection();
}

// Mostrar u ocultar los botones según el estado
function toggleButtonVisibility() {
  const esUltimoFormulario = currentForm === forms.length - 1;
  const esUltimaPregunta =
    currentQuestion === forms[currentForm].questions.length - 1;
  if (elements.btnSiguiente) {
    elements.btnSiguiente.style.display = "flex";
    elements.btnSiguiente.innerHTML = `
      Siguiente
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline-block ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6l6 6-6 6" />
      </svg>
    `;
    
    // Cambiar clase si el botón está seleccionado
    if (elements.btnSiguiente.classList.contains('selected')) {
      elements.btnSiguiente.classList.remove('selected');
    } else {
      elements.btnSiguiente.classList.add('selected');
    }
  }
  if (currentForm > 0 || currentQuestion > 0) {
    elements.btnAnterior.style.display = "flex";
    elements.btnAnterior.innerHTML = `
      Anterior
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline-block ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 18l-6-6 6-6" />
      </svg>
    `;
    // Cambiar clase si el botón está seleccionado
    if (elements.btnAnterior.classList.contains('selected')) {
      elements.btnAnterior.classList.remove('selected');
    } else {
      elements.btnAnterior.classList.add('selected');
    }
  } else {
    elements.btnAnterior.style.display = "none";
  }
}

// Inicializar SignaturePad
function initializeSignaturePad() {
  signaturePad = new SignaturePad(signaturePadCanvas, {
    backgroundColor: "rgba(255, 255, 255, 0)",
    penColor: "rgb(0, 0, 0)",
  });
}

// Mostrar la sección de firma
function showSignatureSection() {
  elements.questionSection.style.display = "none";
  elements.btnSiguiente.style.display = "none";
  elements.btnAnterior.style.display = "none"; // Ocultar botón "Anterior" principal
  elements.signatureSection.style.display = "block";
  btnAnteriorSignature.style.display = "flex"; // Mostrar botón "Anterior" de firma
  cargarFirmaSiExiste();
}

// Cargar firma existente si la hay
function cargarFirmaSiExiste() {
  if (signatures[currentForm]) {
    const img = new Image();
    img.src = signatures[currentForm];
    img.onload = () => {
      signaturePad.clear();
      signaturePad.fromDataURL(img.src);
    };
  } else {
    signaturePad.clear();
  }
}

// Ocultar la sección de firma
function hideSignatureSection() {
  elements.signatureSection.style.display = "none";
  elements.questionSection.style.display = "block";
  elements.btnSiguiente.style.display = "flex";
  elements.btnAnterior.style.display =
    currentForm > 0 || currentQuestion > 0 ? "flex" : "none";
  btnAnteriorSignature.style.display = "none"; // Ocultar botón "Anterior" de firma
}

// Manejar el envío de formularios y firmas
function handleSubmitForms() {
  const formulariosFiltrados = filtrarFormularios();
  for (let i = 0; i < formulariosFiltrados.length; i++) {
    if (!signatures[i]) {
      Swal.fire({
        icon: "warning",
        title: "Firma Faltante",
        text: `Por favor, proporciona la firma para el formulario ${i + 1}.`,
        confirmButtonText: "Aceptar",
      });
      return;
    }
  }

  const data = {
    usuario: {
      uuid_bankingly: userMock.uuid,
    },
    respuestas: answers,
    firmas: signatures,
  };

  // Enviar los datos al servidor utilizando axios con el método PUT
  axios
    .put(
      "https://backend-develop-8a00.up.railway.app/api/annexes/update-fatca-info/",
      data
    )
    .then((response) => {
      Swal.fire({
        icon: "success",
        title: "¡Éxito!",
        text: "Respuestas y firmas guardadas correctamente.",
        confirmButtonText: "Aceptar",
      }).then(() => {
        location.reload(); // Recargar la página al aceptar
      });

      // Limpiar el Local Storage
      localStorage.removeItem("answers");
      localStorage.removeItem("signatures");

      // Reiniciar el formulario
      resetForm();
    })
    .catch((error) => {
      handleAxiosError(error);
    });
}

function handleAxiosError(error) {
  let errorMessage =
    "Hubo un error al procesar tu solicitud. Por favor, inténtalo de nuevo.";

  if (error.response && error.response.data && error.response.data.error) {
    errorMessage = error.response.data.error;
  }

  Swal.fire({
    icon: "error",
    title: "Error",
    text: errorMessage,
    confirmButtonText: "Aceptar",
  });
}

// Guardar la firma y avanzar al siguiente formulario o guardar
function handleSaveSignature() {
  if (signaturePad.isEmpty()) {
    alert("Por favor, proporciona tu firma antes de guardar.");
    return;
  }

  const signatureDataURL = signaturePad.toDataURL();
  signatures[currentForm] = signatureDataURL;
  guardarDatosLocalStorage();

  const formulariosFiltrados = filtrarFormularios();
  if (currentForm < formulariosFiltrados.length - 1) {
    // Limpiar el canvas para la siguiente firma
    signaturePad.clear();

    // Avanzar al siguiente formulario
    currentForm++;
    loadForm();

    // Ocultar la sección de firma
    hideSignatureSection();
  } else {
    // Es el último formulario, proceder a guardar
    handleSubmitForms();
  }
}

// Reiniciar el formulario después de guardar
function resetForm() {
  currentForm = 0;
  currentQuestion = 0;
  for (let key in answers) delete answers[key];
  for (let key in signatures) delete signatures[key];
  elements.questionSection.style.display = "block";
  elements.signatureSection.style.display = "none";
  elements.btnSiguiente.style.display = "flex";
  elements.btnAnterior.style.display = "none";
  btnAnteriorSignature.style.display = "none";  
  elements.btnSiguiente.innerHTML = `
    Siguiente
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline-block ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6l6 6-6 6" />
    </svg>
  `;
  loadForm();
  signaturePad.clear();
}

// Actualizar la interfaz según el estado actual
function actualizarInterfazSegunEstado() {
  // Actualizar la interfaz basada en si hay firmas guardadas o no
  if (signatureSection.style.display === "block" && signatures[currentForm]) {
    // Si ya hay una firma guardada para el formulario actual, mostrarla en el canvas
    const img = new Image();
    img.src = signatures[currentForm];
    img.onload = () => {
      signaturePad.clear();
      signaturePad.fromDataURL(img.src);
    };
  }
}

// Configurar event listeners
function setupEventListeners() {
  elements.questionSection.addEventListener("change", handleInputChange);
  elements.btnSiguiente.addEventListener("click", handleNextClick);
  elements.btnAnterior.addEventListener("click", handlePreviousClick);
  // Eventos para la sección de firma
  clearSignatureButton.addEventListener("click", () => {
    signaturePad.clear();
  });
  submitFormButton.addEventListener("click", handleSaveSignature);
  btnAnteriorSignature.addEventListener("click", handleAnteriorSignatureClick);
}

// Manejar cambios en los inputs
function handleInputChange(event) {
  const target = event.target;
  const currentQuestionType =
    forms[currentForm].questions[currentQuestion].type;

  if (currentQuestionType === "radio") {
    if (target.type === "radio") {
      updateAnswer(target.value);
      elements.btnSiguiente.classList.remove('selected');
    }
  } else if (currentQuestionType === "input") {
    if (target.type === "text") {
      updateAnswer(target.value);
      elements.btnSiguiente.classList.remove('selected');
    }
  } else if (currentQuestionType === "terms") {
    if (target.id === "terms-checkbox") {
      const isChecked = target.checked;
      updateAnswer(isChecked ? "Acepto" : "");
      elements.btnSiguiente.classList.remove('selected');
    }
  } else if (currentQuestionType === "terms-micoopeEnLinea") {
    if (target.id === "terms-checkbox") {
      const isChecked = target.checked;
      updateAnswer(isChecked ? "Acepto" : "");
      elements.btnSiguiente.classList.remove('selected');
    }
  }
}

// Inicializar al cargar la página
document.addEventListener("DOMContentLoaded", () => {
  const uuid = getUUIDFromURL();

  if (uuid) {
    fetchUserData(uuid);
  } else {
    console.error("UUID no encontrado en la URL.");
    renderErrorPage("UUID no proporcionado.");
  }
  initializeSignaturePad();
});

// Obtener el canvas y el contenedor
const canvas = document.getElementById("signature-pad");
const container = document.getElementById("signature-container");

// Función para ajustar el tamaño del canvas al tamaño del contenedor
function resizeCanvas() {
  // Obtener el tamaño del contenedor
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  // Ajustar el tamaño del canvas al tamaño del contenedor
  canvas.width = containerWidth * window.devicePixelRatio;
  canvas.height = containerHeight * window.devicePixelRatio;

  // Ajustar el tamaño del estilo del canvas
  canvas.style.width = containerWidth + "px";
  canvas.style.height = containerHeight + "px";

  // Escalar el contexto 2D para alta resolución
  const context = canvas.getContext("2d");
  context.scale(window.devicePixelRatio, window.devicePixelRatio);
}

// Llamar a la función para ajustar el tamaño del canvas al cargar la página
resizeCanvas();

// Volver a ajustar el tamaño del canvas cuando se cambie el tamaño de la ventana
window.addEventListener("resize", resizeCanvas);

// Funcionalidad del botón para limpiar la firma
document.getElementById("clear-signature").addEventListener("click", () => {
  signaturePad.clear();
});
