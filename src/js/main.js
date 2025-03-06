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
      `https://backend-develop-8a00.up.railway.app/api/annexes/get-form-by-uuid/${uuid}/`
    );

    if (response.status === 200) {
      const userData = response.data;
      userMock = {
        uuid: userData.uuid,
        fullname: userData.fullname,
        dpi: userData.dpi,
        id_asociado: userData.id_asociado,
        location: userData.location,
        fatca_registros: userData.form_registros || [], 
        form_req: userData.form_registros.map((registro) => registro.type_form) || [],
        date: userData.date,
        files: userData.files || [],
       
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
        <div class="flex items-center justify-center min-h-screen bg-blanco oscuro:bg-gris-900">
                <div class="py-8 px-4 mx-auto max-w-screen-sm sm:max-w-screen-md md:max-w-screen-lg lg:max-w-screen-xl lg:py-16 lg:px-6">
                    <img src="./src/img/error.svg" alt="Descripción de la imagen" class="w-3/4 h-auto rounded-lg mx-auto">
                    <div class="mx-auto max-w-screen-sm text-center">
                        <p class="mb-4 text-2xl sm:text-3xl md:text-4xl tracking-tight font-bold text-[#024873]">Ups! Algo salió mal.</p>
                        <p class="mb-4 text-base sm:text-lg font-light text-gray-500 dark:text-gray-400">Error: ${message}</p>
                       <button id="retry-button" class="w-full bg-[#024873] text-white py-3 rounded-lg font-medium flex items-center justify-center">Reintentar</button>
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
  if (!userMock || !userMock.fatca_registros) {
    console.error("userMock o userMock.fatca_registros no están definidos.");
    return; // Detener la inicialización si no está definido
  }

  elements.userName.textContent = userMock.fullname ?? "";
  elements.userId.textContent = userMock.id_asociado ?? "";
  elements.userLocation.textContent = userMock.location ?? "";

  // Filtrar formularios según fatca_registros
  const formulariosFiltrados = filtrarFormularios();

  if (formulariosFiltrados.length > 0) {
    // Encontrar el índice del formulario que corresponde al primer type_form pendiente
    const primerFormularioPendiente = userMock.fatca_registros.find(registro => registro.status === false);
    if (primerFormularioPendiente) {
      currentForm = formulariosFiltrados.findIndex(form => form.type_form === primerFormularioPendiente.type_form);
      if (currentForm === -1) currentForm = 0; // Si no se encuentra, comenzar desde el primero
    }
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
  // Verificar si userMock y userMock.fatca_registros están definidos
  if (!userMock || !Array.isArray(userMock.fatca_registros)) {
    console.error(
      "userMock o userMock.fatca_registros no están definidos o no es un arreglo."
    );
    return []; // Retornar un arreglo vacío si no están definidos
  }

  // Filtrar solo los formularios que tienen status false
  const formulariosRequeridos = userMock.fatca_registros
    .filter(registro => registro.status === false)
    .map(registro => registro.type_form);

  const formulariosFiltrados = forms.filter((form) =>
    formulariosRequeridos.includes(form.type_form)
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

  // Asegurarnos de que currentForm es válido
  if (currentForm >= formulariosFiltrados.length) {
    currentForm = 0;
  }

  const form = formulariosFiltrados[currentForm];
  elements.formNumber.textContent = `Formulario ${currentForm + 1}/${formulariosFiltrados.length}`;
  document.getElementById("form-title").textContent = form.title;
  
  // Resetear la pregunta actual al cambiar de formulario
  currentQuestion = 0;
  loadQuestion();
  toggleButtonVisibility();
}

// Cargar una pregunta específica
function loadQuestion() {
  const formulariosFiltrados = filtrarFormularios();
  const form = formulariosFiltrados[currentForm];
  const question = form.questions[currentQuestion];

  // Verificar si la pregunta es de tipo "pdf"
  if (question.type === "pdf") {
    // Buscar si existe un archivo para este type_form
    const fileData = userMock.files ? userMock.files.find(f => f.type_form === form.type_form) : null;
    const pdfSrc = fileData ? `data:application/pdf;base64,${fileData.file}` : "./W8BEN.pdf";

    elements.questionSection.innerHTML = `
      <div class="bg-blue-50 p-4 rounded-lg">
        <p class="text-[#024873] text-lg font-regular mb-2">${question.text}</p>
        <iframe src="${pdfSrc}" width="100%" height="600px" style="border: none;"></iframe>
        <div class="mt-4 flex items-center">
          <input type="checkbox" id="pdf-terms-checkbox" class="mr-2" ${answers[form.type_form]?.[currentQuestion] === "Acepto" ? "checked" : ""}>
          <label for="pdf-terms-checkbox" class="text-[#024873] text-md font-bold">Acepto los términos y condiciones del documento</label>
        </div>
      </div>
    `;

    // Agregar event listener al checkbox después de renderizar
    const pdfCheckbox = document.getElementById("pdf-terms-checkbox");
    if (pdfCheckbox) {
      pdfCheckbox.addEventListener("change", (event) => {
        updateAnswer(event.target.checked ? "Acepto" : "");
      });
    }
  } else {
    const questionHTML = generateQuestionHTML(question, form.type_form);
    elements.questionSection.innerHTML = `
      <h2 class="text-[#024873] font-medium font-semibold">Pregunta ${
        currentQuestion + 1
      }/${form.questions.length}</h2>
      ${questionHTML}
    `;
    
    // Rellenar la respuesta si ya existe
    if (answers[form.type_form] && answers[form.type_form][currentQuestion] !== undefined) {
      const respuesta = answers[form.type_form][currentQuestion];
      if (question.type === "radio") {
        const radioButtons = document.getElementsByName(
          `question-${form.type_form}-${currentQuestion}`
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

    // Agregar event listeners después de renderizar el HTML
    if (question.type === "terms" || question.type === "terms-micoopeEnLinea") {
      const termsCheckbox = document.getElementById("terms-checkbox");
      if (termsCheckbox) {
        termsCheckbox.checked = answers[form.type_form]?.[currentQuestion] === "Acepto";
        termsCheckbox.addEventListener("change", (event) => {
          updateAnswer(event.target.checked ? "Acepto" : "");
        });
      }
    } else if (question.type === "radio") {
      const radioButtons = document.getElementsByName(
        `question-${form.type_form}-${currentQuestion}`
      );
      radioButtons.forEach((rb) => {
        rb.addEventListener("change", (event) => {
          updateAnswer(event.target.value);
        });
      });
    } else if (question.type === "input") {
      const inputField = elements.questionSection.querySelector("input");
      if (inputField) {
        inputField.addEventListener("input", (event) => {
          updateAnswer(event.target.value);
        });
      }
    }
  }

  elements.signatureSection.style.display = "none";
  elements.btnAnterior.style.display = "flex";
  btnAnteriorSignature.style.display = "none";
  checkNextButton();
  toggleButtonVisibility();
}

// Generar HTML dinámico para una pregunta
function generateQuestionHTML(question, type_form) {
  if (question.type === "radio") {
    return `
      <div class="bg-blue-50 p-4 rounded-lg">
        <p class="text-[#024873] text-lg font-regular">${question.text}</p>
      </div>
      <div class="flex gap-4 mt-4">
        ${question.options
          .map(
            (option) => `
            <label class="flex-1 cursor-pointer">
              <input type="radio" name="question-${type_form}-${currentQuestion}" value="${option}" class="hidden peer" ${
                answers[type_form]?.[currentQuestion] === option ? "checked" : ""
              }>
              <div class="text-center p-3 rounded-lg border-2 text-gray-400 peer-checked:bg-[#56A632] -500 transition duration-300 peer-checked:text-white ${
                answers[type_form]?.[currentQuestion] === option
                  ? "bg-white text-gray-400"
                  : "bg-white text-gray-400"
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
        <p class="class="text-[#024873] text-md font-bold ">${question.text}</p>
        <input type="text" class="mt-2 p-2 border border-gray-300 rounded-lg w-full" value="${
          answers[type_form]?.[currentQuestion] || ""
        }" />
      </div>
    `;
  } else if (question.type === "terms") {
    return `
      <div class="bg-blue-50 p-4 rounded-lg">
        <p class="text-[#024873] text-md font-bold mb-2">${question.text}</p>
        <div id="terms-container" class="h-32 overflow-y-scroll border p-2 rounded-lg">
          <p style="text-align: justify;" class="text-black">
            Con motivo de la Ley Sobre el Cumplimiento Fiscal Relativa a Cuentas en el Extranjero (US Foreign Account Tax Compliance Act, FATCA) YO: ${userMock.fullname}, declaro que conozco, acepto y autorizo expresamente y con pleno consentimiento a "Cooperativa ACREDICOM, R.L., (la Cooperativa), para que reporte y divulgue todo tipo de información sobre mi persona, mi información financiera y los detalles sobre mis operaciones con la Cooperativa(activas y pasivas), en virtud de cualquier requerimiento realizado por entidades locales y extranjeras dentro del marco de la normativa FATCA. Autorizo a la Cooperativa para que realice los reportes necesarios y revele información sobre mi identidad y mis depósitos cuando la Cooperativa en forma unilateral lo considere oportuno. Para que la Cooperativa pueda cumplir a cabalidad con la normativa FATCA, y de conformidad con el artículo 19 del Decreto 2-89, Ley del Organismo Judicial, renuncio a mi derecho de accionar en contra de "Cooperativa ACREDICOM, R.L." por revelar información que pueda catalogarse con carácter confidencial conforme las normas vigentes en la República de Guatemala; en consecuencia libero a "Cooperativa ACREDICOM, R.L." sus Directivos, Gerentes, Representantes Legales, Funcionarios y Empleados de cualquier responsabilidad civil y penal que pudieran derivarse del cumplimiento de la normativa FATCA. Declaro que entiendo que si por cualquier motivo decido no compartir la información anteriormente especificada, dicha negativa podría implicar que la Cooperativa cierre en forma inmediata mis cuentas, servicios y/o productos financieros contratados en la Cooperativa y la cancelación y/o suspensión de remesas, depósitos, pagos, compensaciones, accesos a servicios por medio de páginas web y/o servicios financieros móviles y cualquier otro servicio que la Cooperativa me pudiera estar prestando, sin responsabilidad alguna para la Cooperativa.
          </p>
        </div>
        <div class="mt-4 flex items-center">
          <input type="checkbox" id="terms-checkbox" class="mr-2">
          <label for="terms-checkbox" class=" text-[#024873] text-md font-bold">Acepto los términos y condiciones</label>
        </div>
      </div>
    `;
  } else if (question.type === "terms-micoopeEnLinea") {
    return `
      <div class="bg-blue-50 p-4 rounded-lg">
        <p class="text-[#024873] text-md font-bold mb-2">${question.text}</p>
        <div id="terms-container" class="h-32 overflow-y-scroll border p-2 rounded-lg">
          <p style="text-align: justify;" class="text-black">
            En la República de Guatemala, el ${userMock.date.day}, . Por una parte, COOPERATIVA DE AHORRO Y CRÉDITO AGROMERCANTIL (en adelante LA COOPERATIVA), y por la otra , (en adelante EL USUARIO) quien se identifica con Documento de Identificación Personal con Código Único de Identificación número ${userMock.dpi}. Celebramos el presente contrato de SERVICIOS ELECTRÓNICOS que provee LA COOPERATIVA miembro del Sistema MICOOPE al Usuario, sujeto a los siguientes términos: PRIMERO. ANTECEDENTES:</span> La Cooperativa provee los siguientes servicios electrónicos: MICOOPE EN LINEA. EL USUARIO declara que desea utilizar y acceder a dichos servicios. SEGUNDO. CONVENIO:</span> Las condiciones bajo las cuales la Cooperativa habrá de prestar los servicios electrónicos elegidos por EL USUARIO son las aquí establecidas. En el caso que la Cooperativa implemente nuevos servicios fuera de los aquí ofrecidos, EL USUARIO deberá manifestar si los habrá de utilizar o no, lo que hará saber a la Cooperativa mediante aviso por escrito dentro de los diez (10) días siguientes a que el servicio se puso en uso, en el caso que la Cooperativa no reciba el aviso dentro del plazo indicado, se entenderá que EL USUARIO acepta y utilizará los servicios que se le proveen. TERCERO. CONDICIONES DE PRESTACIÓN DEL SERVICIO: A) Los servicios que inicialmente proveerá la Cooperativa y que serán utilizados por EL USUARIO son MICOOPE EN LINEA, servicios que comprenderán todos los movimientos, consultas y operaciones que se realicen y registren en sus cuentas de ahorros, aportaciones, inversiones, seguros, préstamos, aportaciones, inversiones, seguros, préstamos, tarjetas de crédito o cualquier otro producto y servicio registrado actualmente en la Cooperativa o que EL USUARIO pueda tener en el futuro. B) El contenido del presente documento integra el contrato de prestación de servicios de MICOOPE EN LINEA a prestar por la Cooperativa al Usuario, por lo que sus diferentes secciones corresponden a un mismo cuerpo contractual, independientemente de su ubicación.C) El plazo de prestación del servicio será de doce (12) meses contados a partir de la presente fecha, plazo que se considera automáticamente prorrogado sucesivamente por períodos iguales, si ninguna de las partes comunicase a la otra su determinación en contrario con una antelación de diez (10) días anteriores al vencimiento del plazo inicial o el de sus prorrogas. No obstante lo anterior, la Cooperativa estará facultada para dar por terminada la prestación de cualquier servicio antes del vencimiento del plazo original o el de sus prórrogas sin expresión de causa y sin previa notificación al Usuario. D) Los horarios de prestación de los servicios son establecidos por la Cooperativa y podrán ser modificados por ésta de tiempo en tiempo, pudiendo notificar la Cooperativa al USUARIO, por cualquiera de los medios que considere oportuno, con la antelación debida.E) La prestación de los servicios depende esencialmente de la utilización de líneas telefónicas y energía eléctrica por lo que la suspensión temporal o definitiva, parcial o total de tales servicios por parte de las empresas que lo prestan, sea por la causa que sea, determinará la interrupción de los servicios que se contraten en el presente contrato, sin responsabilidad alguna para la Cooperativa. F) Los servicios también se podrán ver afectados por fallas o incapacidad del equipo, tanto de la Cooperativa como del Usuario o bien por el uso inadecuado de los servicios, equipos o software por parte del Usuario. En caso de interrupción de los servicios por cualquiera de estas causas no habrá responsabilidad alguna de la Cooperativa. G) La Cooperativa utiliza los sistemas de encriptación y seguridad validados por la Autoridad de Certificación Digital que la Cooperativa decide utilizar a través de entidades reconocidas. No obstante lo anterior, se recomienda al Usuario que utilice los servicios de criptografía u otros sistemas de seguridad para prevenir cualquier acceso ilegal, alteración, fraude o irregularidad en las comunicaciones. H) La Cooperativa utiliza como medios de autenticación de la identidad del Usuario, Claves de Acceso, Información Personal y/o Información Confidencial. Por tal razón, el Usuario acepta que para acceder a los servicios objeto del presente contrato, deberá ingresar al sistema (oa los sistemas) usuario, clave de acceso y código de validación (si fuere solicitado por el sistema). El Usuario acepta que es el único responsable por la guarda, custodia y cualquier uso de la clave de acceso (contraseña) o en su caso, las claves de acceso privadas que se le proporcionan, por lo que se compromete a no revelarlas a ninguna persona y mantener estricta confidencialidad de las mismas. En tal virtud, la Cooperativa no será responsable por los daños o perjuicios derivados de cualquier olvido, pérdida, comunicación y del uso indebido de las claves de acceso privado del Usuario, deslindando desde ya a la Cooperativa por el mal uso que se le de al mismo. CUARTO. PAGO DE SERVICIOS A TERCEROS A TRAVÉS DE MICOOPE EN LÍNEA: A) La Cooperativa manifiesta que a través de sus servicios electrónicos el Usuario podrá llevar a cabo operaciones de pago a terceros. B) La Cooperativa no se responsabiliza por errores en el ingreso de datos al sistema o servicios que se proveen por medio del presente contrato. Las diferencias que resulten deben ser conciliadas entre el Usuario y el tercero. C) La Cooperativa no será responsable por el registro contable del pago en los sistemas del proveedor de servicios. D) La Cooperativa no será responsable por fallas en los sistemas del proveedor de servicios. E) La Cooperativa no se responsabiliza ante el Usuario ni ante terceros, si por un pago fuera de tiempo, corresponden multas o penalizaciones al Usuario por pago tardío o declaraciones de impuestos fuera de tiempo. QUINTO. WAP/SMS:Este servicio consistirá en brindar acceso de banca electrónica por medio del teléfono celular, así como el envío de información por medio de mensajes de texto a los mismos; para iniciar el servicio, el Usuario tendrá que aceptar la solicitud de permiso correspondiente a través del uso de su teléfono celular, así como las condiciones y cobros correspondientes a éste. El Usuario es responsable de notificar a la Cooperativa en caso de cambio del número de celular o datos registrados para el uso de MICOOPE en línea. SEXTO. PRECIO: Los servicios electrónicos MICOOPE EN LÍNEA serán gratuitos hasta que la Cooperativa decida cobrarlos, en cuyo caso la Cooperativa propondrá un precio y de ser aceptado por el Usuario el contrato continuará vigente, en caso de no aceptación esto será causa para suspender el contrato y deshabilitar los servicios. Para cuando los servicios se cobren, el Usuario acepta como buenas y exactas las cuentas que la Cooperativa presenta sobre el manejo de los servicios electrónicos MICOOPE EN LÍNEA, así como líquidos, exigibles y de plazo vencido las sumas que la Cooperativa reclama. SEPTIMO. DISPOSICIONES VARIAS: A) El presente contrato se somete a la legislación de la República de Guatemala. B) Las partes harán lo posible por llegar a una solución pacífica o amistosa de todas las controversias relativas al servicio electrónico MICOOPE EN LÍNEA y la interpretación, contravención, terminación o invalidez del presente contrato. El usuario deberá presentar a la Cooperativa solicitud por escrito para la solución del problema. Si las partes no pudieron resolver amigablemente la controversia acuerdan que deberán resolver el conflicto a través del procedimiento de conciliación regulado en el Reglamento de Conciliación y Arbitraje del Centro De Arbitraje Y Conciliación De La Cámara De Comercio De Guatemala (en adelante CENAC). La Cooperativa define como lugar para recibir notificaciones sus Oficinas Centrales. El Usuario define como lugar para recibir notificaciones la dirección que proporcione en el formulario de solicitud de servicios electrónicos MICOOPE EN LÍNEA. C) El Usuario autoriza a la Cooperativa a recibir datos de número de sus cuentas, nombres completos, estados de cuenta y cualquier información que sea necesaria para llevar a cabo transacciones y operaciones de los servicios provistos por virtud del presente contrato que corresponden a COOPERATIVA DE AHORRO Y CRÉDITO ACREDICOM o cualquier entidad del SISTEMA MICOOPE con la que la Cooperativa tenga relación. D) El Usuario autoriza a la Cooperativa a efectuar todas o algunas de las transacciones correspondientes a los servicios de MICOOPE EN LÍNEA con las cuentas que el mismo tenga en las entidades del SISTEMA MICOOPE o cualquier entidad con la que la Cooperativa establezca relación de carácter comercial.E) El Usuario encarga y faculta a la Cooperativa para que sirva comunicar a las entidades del SISTEMA MICOOPE su instrucción irrevocable para que puedan proporcionarle la información de sus cuentas por la vía electrónica. F) En caso de conflicto que se suscite entre la Cooperativa y el Usuario con motivo de la interpretación, aplicación, vigencia, cumplimiento, incumplimiento o terminación de los servicios electrónicos prestados por la Cooperativa en virtud del presente contrato; las partes se comprometen a no cuestionar la admisibilidad probatoria de los registros, archivos, documentos digitales que den cuenta de fechas, horarios, envíos, recepción, contenido y cantidades de datos o información almacenada o transmitida los que podrán tener un valor probatorio equivalente al que el derecho le otorga a los escritos en soporte papel y constituirán prueba de los hechos a que aluden. G) Declarar las partes expresa y voluntariamente que cualquier información proveída como consecuencia de cualquier relación que exista, presente o futura, entre el Usuario, la Cooperativa, entidades del Sistema MICOOPE y/o sus entidades vinculadas o relacionadas se mantendrán confidenciales de acuerdo con las prácticas internas para el manejo de información. No obstante lo anterior, el usuario acepta que la Cooperativa pueda compartir, transferir, facilitar, proporcionar y/o revelar la información proporcionada por el Usuario, sin responsabilidad alguna, en cualquiera de los siguientes casos: I) Cuando haya de proporcionarla, revelarla o facilitarla a sus asesores legales, internos o externos, firmas independientes de auditores y contadores, autoridades Gubernamentales que cuenten con la autorización o facultad, así como a cualquiera de las entidades integrantes, relacionadas o vinculadas al sistema MICOOPE, que sea su domicilio y nacionalidad, especialmente para la implementación del Sistema T24, y cualquier otro sistema tecnológico que se pretenda implementar en el futuro, cuya finalidad sea realizar operaciones y/o controles mediante la generación, gestión y administración de un Código Único para los Asociados dentro del Sistema MICOOPE; y II) Cuando se proporcione a cualquier cesionario actual o potencial siempre y cuando, quede sujeto a estipulaciones sustancialmente similares a las descritas anteriormente. OCTAVO. ACEPTACIÓN: El Usuario acepta lo siguiente: A) Que usará los servicios cumpliendo con los requerimientos y condiciones aquí señaladas y las que en el futuro establezca la Cooperativa para el efecto. B) que todas las operaciones que realicen en los servicios electrónicos MICOOPE EN LÍNEA y los que se puedan ofrecer en el futuro, quedarán registradas y operadas por la Cooperativa, teniendo validez después de su registro conforme los procedimientos establecidos por la Cooperativa. C) Que todas las operaciones y demás usos que haga a través de MICOOPE EN LÍNEA y los que se puedan ofrecer en el futuro, serán por su propia cuenta y riesgo, aceptando los estados de cuenta, informes y resultados que el propio sistema formule o archiv de las mismas. D) Que no podrá ceder, parcial o totalmente, prestar, negociar o permitir que los derechos que le brinda el presente contrato sean ejercitados por terceras personas, renunciando desde ya al fuero de su domicilio y se somete a los tribunales que la Cooperativa elija, señalando la dirección que proporciona en el formulario de solicitud de servicios electrónicos MICOOPE EN LÍNEA, como lugar para recibir cualquier aviso o notificación siendo responsabilidad del Usuario informar inmediatamente de cualquier cambio en dicha dirección. E) Que bajo ningún concepto la Cooperativa será responsable por errores u omisiones en la información electrónica proporcionada cuya fuente no sea la Cooperativa, ni por el uso que se haga de la misma. F) Que será por su propia cuenta y responsabilidad el uso de la información electrónica e impresiones de la misma que obtenga a través de los servicios electrónicos. G) Que es responsable del acceso de terceros a la(s) computadora(s), celular(es) o cualquier dispositivo electrónico desde donde utilice el sistema de MICOOPE EN LÍNEA liberando a la Cooperativa de toda responsabilidad que de ello se derive. H) Que será el único responsable del contrato o acuerdo subyacente que origine el pago o traslado de fondos de una cuenta a otra mediante los servicios de MICOOPE EN LÍNEA. I) Que no utilizará el sistema y los servicios de MICOOPE EN LÍNEA para realizar operaciones o transacciones ilícitas, fraudulentas, accesos ilegales a sitios de Internet o cualquier actividad que viole las leyes vigentes en la República de Guatemala y/o leyes internacionales relacionadas. J) Proporcionar la información y documentos que le sean requeridos por la Cooperativa en cumplimiento de las leyes, reglamentos, oficios normativos o políticas internas vigentes en materia de Prevención de Lavado de Dinero y Financiamiento al Terrorismo. K) Que la Cooperativa quedará exenta de toda responsabilidad y liberada del cumplimiento de sus obligaciones cuando por razones de caso fortuito o fuerza mayor no se puedan efectuar las transacciones, operaciones o cualquiera de los servicios electrónicos que provee la Cooperativa. L) Al firmar el contrato se hace responsable del uso de código, usuario y contraseña que recibe, aceptando los términos y condiciones de uso y la política de privacidad vigentes en el servicio MICOOPE EN LINEA. Por último, las partes aceptan todo lo contenido en el presente contrato y lo suscriben en: Guatemala, ${userMock.date.day}, ${userMock.date.text}. 
          </p>
        </div>
        <div class="mt-4 flex items-center">
          <input type="checkbox" id="terms-checkbox" class="mr-2">
          <label for="terms-checkbox" class=" text-[#024873] text-md font-bold">Acepto los términos y condiciones</label>
        </div>
      </div>
    `;
  } else if (question.type === "pdf") {
    return `
      <div class="bg-blue-50 p-4 rounded-lg">
        <p class="text-[#024873] text-lg font-regular mb-2">${question.text}</p>
        <iframe src="${question.src || "./W8BEN.pdf"}" width="100%" height="600px" style="border: none;"></iframe>
        <div class="mt-4 flex items-center">
          <input type="checkbox" id="pdf-terms-checkbox" class="mr-2">
          <label for="pdf-terms-checkbox" class="text-[#024873] text-md font-bold">Acepto los términos y condiciones del documento</label>
        </div>
      </div>
    `;
  } else if (question.type === "date") {
    return `
      <div class="bg-blue-50 p-4 rounded-lg">
        <p class="text-[#024873] text-lg font-regular">${question.text}</p>
        <input type="date" class="mt-2 p-2 border border-gray-300 rounded-lg w-full" value="${
          answers[type_form]?.[currentQuestion] || ""
        }" />
      </div>
    `;
  }
}

// Actualizar la respuesta en el objeto de respuestas
function updateAnswer(value) {
  const formulariosFiltrados = filtrarFormularios();
  const form = formulariosFiltrados[currentForm];
  
  if (!answers[form.type_form]) {
    answers[form.type_form] = {};
  }
  answers[form.type_form][currentQuestion] = value;
  guardarDatosLocalStorage();
  checkNextButton();
}

// Verificar si el botón "Siguiente" debe estar habilitado
function checkNextButton() {
  const formulariosFiltrados = filtrarFormularios();
  const form = formulariosFiltrados[currentForm];
  const currentQuestionType = form.questions[currentQuestion].type;
  const hasAnswer = answers[form.type_form]?.[currentQuestion];

  // Remover la clase disabled y agregar la clase selected si hay respuesta
  if (elements.btnSiguiente) {
    elements.btnSiguiente.classList.remove('disabled');
    if (hasAnswer) {
      elements.btnSiguiente.classList.add('selected');
    } else {
      elements.btnSiguiente.classList.remove('selected');
    }
  }
}

// Manejar clic en "Siguiente"
function handleNextClick() {
  const formulariosFiltrados = filtrarFormularios();
  const form = formulariosFiltrados[currentForm];
  const currentQuestionType = form.questions[currentQuestion].type;
  const hasAnswer = answers[form.type_form]?.[currentQuestion];

  // Verificar si la pregunta actual tiene respuesta
  if (!hasAnswer) {
    let mensajeError = "";
    let icono = 'warning';
    
    // Personalizar mensaje según el tipo de pregunta
    if (currentQuestionType === "radio") {
      mensajeError = "Por favor, seleccione una opción para continuar.";
    } else if (currentQuestionType === "input") {
      mensajeError = "Por favor, complete el campo requerido para continuar.";
    } else if (currentQuestionType === "terms" || currentQuestionType === "terms-micoopeEnLinea") {
      mensajeError = "Por favor, acepte los términos y condiciones para continuar.";
      icono = 'info';
    } else if (currentQuestionType === "pdf") {
      mensajeError = "Por favor, acepte los términos del documento para continuar.";
      icono = 'info';
    }

    // Mostrar alerta con SweetAlert2
    Swal.fire({
      icon: icono,
      title: '¡Atención!',
      text: mensajeError,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#024873',
      showClass: {
        popup: 'animate__animated animate__fadeInDown'
      },
      hideClass: {
        popup: 'animate__animated animate__fadeOutUp'
      }
    });
    return;
  }

  // Si hay respuesta, continuar con el flujo normal
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

// Mostrar u ocultar los botones según el estado actual
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
    if (elements.btnSiguiente.classList.contains("selected")) {
      elements.btnSiguiente.classList.remove("selected");
    } else {
      elements.btnSiguiente.classList.add("selected");
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
    if (elements.btnAnterior.classList.contains("selected")) {
      elements.btnAnterior.classList.remove("selected");
    } else {
      elements.btnAnterior.classList.add("selected");
    }
  } else {
    elements.btnAnterior.style.display = "none";
  }
}

// Inicializar SignaturePad
function initializeSignaturePad() {
  if (signaturePad) {
    signaturePad.clear();
    signaturePad.off();
  }
  
  const canvas = document.getElementById("signature-pad");
  if (canvas) {
    signaturePad = new SignaturePad(canvas, {
      backgroundColor: "rgba(255, 255, 255, 0)",
      penColor: "rgb(0, 0, 0)",
      minWidth: 0.5,
      maxWidth: 2.5,
      throttle: 16
    });
  }
}

// Mostrar la sección de firma
function showSignatureSection() {
  elements.questionSection.style.display = "none";
  elements.btnSiguiente.style.display = "none";
  elements.btnAnterior.style.display = "none";
  elements.signatureSection.style.display = "block";
  btnAnteriorSignature.style.display = "flex";
  
  // Reinicializar el canvas y cargar firma existente
  setTimeout(() => {
    initializeSignaturePad();
    cargarFirmaSiExiste();
    resizeCanvas();
  }, 100);
}

// Cargar firma existente si la hay
function cargarFirmaSiExiste() {
  if (signatures[currentForm]) {
    const img = new Image();
    img.src = signatures[currentForm];
    img.onload = () => {
      if (signaturePad) {
        signaturePad.clear();
        signaturePad.fromDataURL(img.src);
      }
    };
  } else if (signaturePad) {
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
  btnAnteriorSignature.style.display = "none";
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
    forms: {}
  };

  formulariosFiltrados.forEach((form, index) => {
    data.forms[form.type_form] = {
      respuestas: answers,
      firma: {
        [form.type_form]: signatures[index] || ""
      },
      type_form: form.type_form
    };
  });
   axios
     .put(
       "https://backend-develop-8a00.up.railway.app/api/annexes/update-form/",
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
       })
       // Limpiar el Local Storage
       localStorage.removeItem("answers");
       localStorage.removeItem("signatures")
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
    Swal.fire({
      icon: 'warning',
      title: '¡Atención!',
      text: 'Por favor, proporciona tu firma antes de guardar.',
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#024873'
    });
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
  const currentQuestionType = forms[currentForm].questions[currentQuestion].type;

  if (currentQuestionType === "radio") {
    if (target.type === "radio") {
      updateAnswer(target.value);
      elements.btnSiguiente.classList.remove("selected");
    }
  } else if (currentQuestionType === "input") {
    if (target.type === "text") {
      updateAnswer(target.value);
      elements.btnSiguiente.classList.remove("selected");
    }
  } else if (currentQuestionType === "terms") {
    if (target.id === "terms-checkbox") {
      const isChecked = target.checked;
      updateAnswer(isChecked ? "Acepto" : "");
      elements.btnSiguiente.classList.remove("selected");
    }
  } else if (currentQuestionType === "terms-micoopeEnLinea") {
    if (target.id === "terms-checkbox") {
      const isChecked = target.checked;
      updateAnswer(isChecked ? "Acepto" : "");
      elements.btnSiguiente.classList.remove("selected");
    }
  } else if (currentQuestionType === "pdf") {
    if (target.id === "pdf-terms-checkbox") {
      const isChecked = target.checked;
      updateAnswer(isChecked ? "Acepto" : "");
      elements.btnSiguiente.classList.remove("selected");
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
  const container = document.getElementById("signature-container");
  const canvas = document.getElementById("signature-pad");
  
  if (container && canvas) {
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

    // Redibujar la firma si existe
    if (signaturePad && signatures[currentForm]) {
      cargarFirmaSiExiste();
    }
  }
}

// Llamar a la función para ajustar el tamaño del canvas al cargar la página
resizeCanvas();

// Volver a ajustar el tamaño del canvas cuando se cambie el tamaño de la ventana
window.addEventListener("resize", resizeCanvas);

// Funcionalidad del botón para limpiar la firma
document.getElementById("clear-signature").addEventListener("click", () => {
  signaturePad.clear();
});

// Agregar estilos CSS para el botón siguiente
const style = document.createElement('style');
style.textContent = `
  #btn-siguiente {
    transition: all 0.3s ease;
  }
  #btn-siguiente.selected {
    background-color: #56A632;
  }
  #btn-siguiente:not(.selected) {
    background-color: #024873;
    opacity: 0.8;
  }
  #btn-siguiente:hover {
    opacity: 1;
  }
`;
document.head.appendChild(style);
