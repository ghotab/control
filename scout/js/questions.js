/**
 * TAB SCOUT — Banco Oficial de Preguntas Conductuales y Técnicas (50 reactivos)
 * ---------------------------------------------------------------------------
 * Cada candidato responde exactamente 30 preguntas en este orden:
 *  1) 10 preguntas del Módulo 1: Cultura, Actitud y Disponibilidad (Común)
 *  2) 10 preguntas del Módulo Específico según su rol (Coordinador, Técnico o Auxiliar)
 *  3) 10 preguntas del Módulo 5: Validación y Contraste (presentado en UI de forma
 *     neutral como "Escenarios y Toma de Decisiones")
 */

export const MODULES_META = {
    M1: {
        code: 'M1',
        uiTitle: 'Cultura, Actitud y Disponibilidad',
        adminTitle: 'Módulo 1: Cultura, Actitud y Disponibilidad',
        badgeClass: 'badge-module-common'
    },
    M2: {
        code: 'M2',
        uiTitle: 'Liderazgo, Gestión y Disciplina Operativa',
        adminTitle: 'Módulo 2: Coordinadores (Liderazgo y Gestión)',
        role: 'Coordinador',
        badgeClass: 'badge-module-role'
    },
    M3: {
        code: 'M3',
        uiTitle: 'Diagnóstico Técnico y Operación en Base',
        adminTitle: 'Módulo 3: Técnicos (Diagnóstico y Campo)',
        role: 'Técnico',
        badgeClass: 'badge-module-role'
    },
    M4: {
        code: 'M4',
        uiTitle: 'Organización, Precisión y Gestión de Información',
        adminTitle: 'Módulo 4: Auxiliares (Control y Precisión Documental)',
        role: 'Auxiliar',
        badgeClass: 'badge-module-role'
    },
    M5: {
        code: 'M5',
        // En la UI del candidato se muestra neutral para no alertar sobre validación de contraste
        uiTitle: 'Escenarios y Toma de Decisiones',
        adminTitle: 'Módulo 5: Validación y Contraste (Escenarios Críticos)',
        badgeClass: 'badge-module-contrast'
    }
};

export const QUESTION_BANK = {
    // =========================================================================
    // Módulo 1: Cultura, Actitud y Disponibilidad (Común: IDs 1 - 10)
    // =========================================================================
    module1_common: [
        {
            id: 1,
            module: 'M1',
            text: '¿Qué te motivó a buscar oportunidades en esta empresa y qué esperas de nuestro entorno de trabajo?'
        },
        {
            id: 2,
            module: 'M1',
            text: 'Cuéntame de un trabajo donde sentiste que el ambiente era difícil. ¿Qué lo hacía difícil para ti?'
        },
        {
            id: 3,
            module: 'M1',
            text: 'Háblame de una regla o política en tu trabajo anterior con la que no estabas de acuerdo. ¿Cómo la manejaste?'
        },
        {
            id: 4,
            module: 'M1',
            text: 'Todos cometemos errores. Cuéntame de un error operativo que cometiste, cómo lo reportaste y qué consecuencias tuvo.'
        },
        {
            id: 5,
            module: 'M1',
            text: '¿Cómo organizas tu tiempo cuando tienes tres tareas urgentes asignadas al mismo tiempo?'
        },
        {
            id: 6,
            module: 'M1',
            text: 'Si le pedimos referencias a tu último jefe, ¿qué nos diría que es tu mayor área de oportunidad o debilidad?'
        },
        {
            id: 7,
            module: 'M1',
            text: '¿Cuál consideras que es un motivo justificado para ausentarte o llegar tarde al trabajo?'
        },
        {
            id: 8,
            module: 'M1',
            text: '¿Cómo reaccionas cuando recibes retroalimentación negativa de algo en lo que te esforzaste mucho?'
        },
        {
            id: 9,
            module: 'M1',
            text: 'Describe tu rutina de trabajo ideal en una semana normal.'
        },
        {
            id: 10,
            module: 'M1',
            text: '¿Qué es lo que más te frustra de trabajar en equipo y cómo lo sobrellevas?'
        }
    ],

    // =========================================================================
    // Módulo 2: Coordinadores (Solo si rol = Coordinador: IDs 11 - 20)
    // =========================================================================
    module2_coordinador: [
        {
            id: 11,
            module: 'M2',
            text: 'Cuéntame de una ocasión en la que tuviste que corregir o levantar un acta a alguien de tu equipo. ¿Qué palabras usaste?'
        },
        {
            id: 12,
            module: 'M2',
            text: '¿Cuál es la diferencia, en tu experiencia, entre ser un jefe estricto y ser un mal jefe?'
        },
        {
            id: 13,
            module: 'M2',
            text: 'Describe una vez que un subordinado se negó a hacer una tarea. ¿Qué hiciste exactamente y cómo terminó?'
        },
        {
            id: 14,
            module: 'M2',
            text: '¿Cómo mides que tu equipo está trabajando bien si tú no estás físicamente con ellos?'
        },
        {
            id: 15,
            module: 'M2',
            text: 'Si notas que un técnico tiene fallas recurrentes, ¿cuál es tu proceso paso a paso antes de llegar a una baja?'
        },
        {
            id: 16,
            module: 'M2',
            text: '¿Qué haces si tu jefe directo te da una instrucción que sabes que va a generar molestia en tu equipo?'
        },
        {
            id: 17,
            module: 'M2',
            text: 'Cuéntame de alguna vez que tuviste que desvincular a alguien. ¿Cómo preparaste el terreno legal y administrativo?'
        },
        {
            id: 18,
            module: 'M2',
            text: '¿Cómo te ganas el respeto de un equipo técnico que lleva más tiempo en la empresa que tú?'
        },
        {
            id: 19,
            module: 'M2',
            text: 'Un técnico te dice que no sabe resolver un problema. ¿Se lo resuelves tú, lo hace él, o cómo lo manejan?'
        },
        {
            id: 20,
            module: 'M2',
            text: 'Háblame de la situación más tensa que hayas vivido con quejas laborales o conflictos internos, y cómo participaste para resolverla.'
        }
    ],

    // =========================================================================
    // Módulo 3: Técnicos (Solo si rol = Técnico: IDs 21 - 30)
    // =========================================================================
    module3_tecnico: [
        {
            id: 21,
            module: 'M3',
            text: 'Cuéntame de la falla técnica más extraña o difícil que hayas resuelto. ¿Cómo dedujiste la solución?'
        },
        {
            id: 22,
            module: 'M3',
            text: '¿Qué haces cuando tienes que reparar un equipo hoy mismo pero no tienes la herramienta o refacción ideal en la base?'
        },
        {
            id: 23,
            module: 'M3',
            text: 'Un operador de autobús te presiona con gritos porque su salida se retrasa por tu revisión. ¿Cómo le respondes?'
        },
        {
            id: 24,
            module: 'M3',
            text: 'Describe tu proceso mental (paso a paso) cuando un equipo electrónico que ayer funcionaba, hoy no enciende.'
        },
        {
            id: 25,
            module: 'M3',
            text: 'Háblame de alguna vez que echaste a perder un equipo o herramienta por error. ¿Qué hiciste después?'
        },
        {
            id: 26,
            module: 'M3',
            text: '¿Cómo te mantienes actualizado cuando llegan tecnologías (como cámaras inteligentes o GPS) que nunca habías visto?'
        },
        {
            id: 27,
            module: 'M3',
            text: 'Si tu coordinador te pide instalar un equipo de una forma que sabes que fallará a futuro por vibración o calor, ¿qué le dices?'
        },
        {
            id: 28,
            module: 'M3',
            text: '¿Qué prefieres: trabajar en un solo problema complejo todo el día, o resolver 10 problemas rutinarios rápidos? ¿Por qué?'
        },
        {
            id: 29,
            module: 'M3',
            text: '¿Cómo documentas tu trabajo al terminar el turno para que tu relevo sepa exactamente qué hiciste?'
        },
        {
            id: 30,
            module: 'M3',
            text: 'Cuéntame de alguna ocasión en la que tuviste que pedir ayuda porque un problema técnico te superó.'
        }
    ],

    // =========================================================================
    // Módulo 4: Auxiliares (Solo si rol = Auxiliar: IDs 31 - 40)
    // =========================================================================
    module4_auxiliar: [
        {
            id: 31,
            module: 'M4',
            text: 'Describe detalladamente cómo nombras y organizas tus archivos de trabajo para no perderlos.'
        },
        {
            id: 32,
            module: 'M4',
            text: 'Cuéntame de alguna vez que perdiste información importante en un trabajo anterior. ¿Cómo lo solucionaste?'
        },
        {
            id: 33,
            module: 'M4',
            text: 'Si te piden extraer un video urgente de un siniestro, pero tienes otros tres reportes atrasados, ¿cómo decides qué hacer primero?'
        },
        {
            id: 34,
            module: 'M4',
            text: '¿Qué haces si el sistema de almacenamiento o tu computadora falla a la mitad de tu turno?'
        },
        {
            id: 35,
            module: 'M4',
            text: 'Si un técnico de la base no te entrega un disco de grabación que necesitas para un reporte, ¿cómo procedes?'
        },
        {
            id: 36,
            module: 'M4',
            text: 'Las tareas de revisión de video pueden ser muy rutinarias. ¿Qué método usas para mantener la concentración y no saltarte detalles?'
        },
        {
            id: 37,
            module: 'M4',
            text: 'Háblame de una ocasión en la que detectaste un error en un documento o reporte que nadie más había visto.'
        },
        {
            id: 38,
            module: 'M4',
            text: 'Si un área externa te exige información que, por procedimiento, no estás autorizado a dar sin firma de tu coordinador, ¿cómo les contestas?'
        },
        {
            id: 39,
            module: 'M4',
            text: '¿Cómo te aseguras de que un reporte numérico o estadístico que vas a enviar no tenga errores de captura?'
        },
        {
            id: 40,
            module: 'M4',
            text: '¿Qué prefieres: que te den instrucciones con el paso a paso exacto, o que te den la meta final y tú veas cómo llegas a ella?'
        }
    ],

    // =========================================================================
    // Módulo 5: Escenarios y Toma de Decisiones (Común - Contraste: IDs 41 - 50)
    // =========================================================================
    module5_contrast: [
        {
            id: 41,
            module: 'M5',
            text: 'Hace un momento explicaste cómo manejas la presión. Ahora cuéntame de una vez que la presión te superó y qué consecuencias hubo.'
        },
        {
            id: 42,
            module: 'M5',
            text: 'Todos hemos tenido roces con algún jefe. Dime cuál ha sido el mayor desacuerdo que tuviste con tu supervisor anterior.'
        },
        {
            id: 43,
            module: 'M5',
            text: 'Si un compañero de tu mismo nivel rompe una regla grave de la empresa, y eres el único que lo sabe, ¿qué haces en la vida real?'
        },
        {
            id: 44,
            module: 'M5',
            text: '¿Te consideras una persona que sigue las reglas al 100% siempre, o crees que hay reglas que se deben romper para sacar el trabajo rápido?'
        },
        {
            id: 45,
            module: 'M5',
            text: 'Cuéntame de alguna vez en la que tomaste una decisión que iba en contra del manual, pero solucionó un problema urgente.'
        },
        {
            id: 46,
            module: 'M5',
            text: 'Si te contratamos y a los tres meses decides renunciar, ¿cuál crees que sería la razón más probable?'
        },
        {
            id: 47,
            module: 'M5',
            text: '¿Cuál consideras que ha sido la mayor injusticia que has sufrido en un empleo?'
        },
        {
            id: 48,
            module: 'M5',
            text: 'Imagina que te acusan de un error operativo que en realidad cometió tu compañero. ¿Cómo te defiendes ante tu jefe?'
        },
        {
            id: 49,
            module: 'M5',
            text: 'Dime algo operativo o técnico en lo que eres genuinamente malo y prefieres pedir ayuda.'
        },
        {
            id: 50,
            module: 'M5',
            text: '¿Qué pregunta no se incluyó en esta evaluación y sientes que hubiera sido importante responder?'
        }
    ]
};

/**
 * Normaliza el nombre del rol para evitar problemas de acentos o mayúsculas
 */
export function normalizeRole(role) {
    const clean = String(role || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    if (clean.includes('coord')) return 'Coordinador';
    if (clean.includes('aux')) return 'Auxiliar';
    return 'Técnico';
}

/**
 * Construye el cuestionario exacto de 30 preguntas para el candidato según su rol:
 *  - 1..10: Módulo 1 (Cultura, Actitud y Disponibilidad)
 *  - 11..20: Módulo Específico del Rol (Coordinador [11-20], Técnico [21-30] o Auxiliar [31-40])
 *  - 21..30: Módulo 5 (Escenarios y Toma de Decisiones / Validación y Contraste [41-50])
 *
 * Cada objeto devuelto incluye:
 *  - stepNumber: 1..30 (orden secuencial para el candidato)
 *  - id: ID original en el banco de 50 preguntas (1..50)
 *  - key: 'q_<id>' (clave utilizada en el JSONB `answers`)
 *  - text: Texto íntegro de la pregunta
 *  - moduleCode: 'M1' | 'M2' | 'M3' | 'M4' | 'M5'
 *  - sectionUiTitle: Título visible para el candidato
 *  - sectionAdminTitle: Título completo para el administrador / reporte IA
 */
export function getQuestionsForRole(role) {
    const normalized = normalizeRole(role);

    let roleQuestions = QUESTION_BANK.module3_tecnico;
    if (normalized === 'Coordinador') {
        roleQuestions = QUESTION_BANK.module2_coordinador;
    } else if (normalized === 'Auxiliar') {
        roleQuestions = QUESTION_BANK.module4_auxiliar;
    }

    const combined = [
        ...QUESTION_BANK.module1_common,
        ...roleQuestions,
        ...QUESTION_BANK.module5_contrast
    ];

    return combined.map((q, index) => {
        const meta = MODULES_META[q.module];
        return {
            stepNumber: index + 1,
            totalSteps: 30,
            id: q.id,
            key: `q_${q.id}`,
            moduleCode: q.module,
            text: q.text,
            sectionUiTitle: meta.uiTitle,
            sectionAdminTitle: meta.adminTitle
        };
    });
}

