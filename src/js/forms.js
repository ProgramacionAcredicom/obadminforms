export const forms = [  
    {
        form_no: 0,
        title: "Cuestionario ley FACTA",
        questions: [
            { text: "¿Es ciudadano de los Estados Unidos de América?", type: "radio", options: ["Si", "No"] },
            { text: "¿Es residente legal de los Estados Unidos de América?", type: "radio", options: ["Si", "No"] },
            { text: "¿Cuenta con doble nacionalidad?", type: "radio", options: ["Si", "No"] },
            { text: "¿Ha permanecido legalmente en territorio de los Estados Unidos de América por 6 o más meses?", type: "radio", options: ["Si", "No"] },
        ]
    },
    {
        form_no: 1,
        title: "Liberación de responsabilidad",
        questions: [
            { text: "Por favor, lea y acepte los términos y condiciones para continuar.", type: "terms" },
            { text: "Por favor, descargue y revise el siguiente PDF:", type: "pdf" }
        ]
    }
    
]; 