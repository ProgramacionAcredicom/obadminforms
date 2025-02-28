export const forms = [  
    {
        type_form: 1,
        title: "Cuestionario ley FACTA",
        questions: [
            { text: "¿Es ciudadano de los Estados Unidos de América?", type: "radio", options: ["Si", "No"] },
            { text: "¿Es residente legal de los Estados Unidos de América?", type: "radio", options: ["Si", "No"] },
            { text: "¿Cuenta con doble nacionalidad?", type: "radio", options: ["Si", "No"] },
            { text: "¿Ha permanecido legalmente en territorio de los Estados Unidos de América por 6 o más meses?", type: "radio", options: ["Si", "No"] },
        ]
    },
    {
        type_form: 2,
        title: "Liberación de responsabilidad",
        questions: [
            { text: "Por favor, lea y acepte los términos y condiciones para continuar.", type: "terms" },

        ]
    },
    {
        type_form: 3,
        title: "Micoope en linea",
        questions: [
            { text: "Por favor, lea y acepte los términos y condiciones para continuar.", type: "terms-micoopeEnLinea" },
        ]
    }, 
    {
        type_form: 4,
        title: "W9",
        questions: [
            { text: "Por favor, lea y acepte los términos y condiciones para continuar.", type: "pdf" },
        ]
    },
   // {
   //     type_form: 5,
   //     title: "W8",
   //     questions: [
   //         { text: "Por favor, lea y acepte los términos y condiciones para continuar.", type: "pdf" },
   //     ]
   // }
]; 