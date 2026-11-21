/**
 * TAB SCOUT — Banco Oficial de Preguntas Híbridas (55 reactivos en banco)
 * ---------------------------------------------------------------------------
 * Formato Híbrido Interactivo Anti-fatiga:
 *  - `type: 'choice'`: Tarjetas de Elección Forzada (4 opciones A, B, C, D)
 *  - `type: 'slider'`: Escala Visual / Espectro del 1 al 10 con etiquetas en extremos
 *  - `type: 'text'`  : Texto Libre Estratégico para comportamiento pasado
 *
 * Estructura del cuestionario por candidato:
 *  1) Módulo 1: Cultura, Actitud y Operación (Común - 10 preguntas: IDs 1..10)
 *  2) Módulo Específico según Rol (10 preguntas):
 *     - Coordinador (Módulo 2: IDs 11..20)
 *     - Técnico     (Módulo 3: IDs 21..30)
 *     - Auxiliar    (Módulo 4: IDs 31..40)
 *  3) Módulo 5: Inteligencia Emocional, Integridad y Adaptabilidad (Común - 15 preguntas: IDs 41..55)
 *     (En la UI del candidato se titula de forma neutral: "Estilo de Comunicación y Escenarios")
 */

export const MODULES_META = {
    M1: {
        code: 'M1',
        uiTitle: 'Cultura, Actitud y Operación',
        adminTitle: 'Módulo 1: Cultura, Actitud y Operación',
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
        // En la UI del candidato se muestra neutral para no alertar sobre validación de temperamento/contraste
        uiTitle: 'Estilo de Comunicación y Escenarios',
        adminTitle: 'Módulo 5: Inteligencia Emocional, Integridad y Adaptabilidad',
        badgeClass: 'badge-module-contrast'
    }
};

export const QUESTION_BANK = {
    // =========================================================================
    // Módulo 1: Cultura, Actitud y Operación (Común - 10 preguntas: IDs 1 - 10)
    // =========================================================================
    module1_common: [
        {
            id: 1,
            module: 'M1',
            type: 'text',
            text: '¿Qué te motivó a buscar esta oportunidad y qué esperas de nuestro entorno de trabajo?'
        },
        {
            id: 2,
            module: 'M1',
            type: 'slider',
            text: 'Disponibilidad y ritmo operativo:',
            minLabel: '1 = Prefiero horarios fijos y rutina predecible',
            maxLabel: '10 = Me adapto sin problema a turnos rolados y urgencias de último minuto'
        },
        {
            id: 3,
            module: 'M1',
            type: 'choice',
            text: 'Te asignan una regla o política nueva con la que no estás de acuerdo porque hace el trabajo más lento. ¿Cuál es tu reacción real?',
            options: [
                { key: 'A', label: 'La aplico al pie de la letra y después pido un espacio en privado para proponer una mejora con datos.' },
                { key: 'B', label: 'La aplico solo cuando me están supervisando; en el día a día hago lo que es más práctico.' },
                { key: 'C', label: 'Expreso mi desacuerdo abiertamente frente al equipo para que se note que la regla no funciona.' },
                { key: 'D', label: 'La cumplo sin decir nada, aunque me genere molestia durante la jornada.' }
            ]
        },
        {
            id: 4,
            module: 'M1',
            type: 'text',
            text: 'Todos cometemos errores. Cuéntame de un error operativo que cometiste en el pasado, cómo lo reportaste y qué consecuencias tuvo.'
        },
        {
            id: 5,
            module: 'M1',
            type: 'choice',
            text: 'Tienes tres tareas urgentes al mismo tiempo y tu jefe no contesta el teléfono. ¿Qué haces?',
            options: [
                { key: 'A', label: 'Priorizo la que impacta directamente la operación/seguridad, documento las otras dos y aviso por mensaje.' },
                { key: 'B', label: 'Intento avanzar un poco en las tres al mismo tiempo para que nadie se queje.' },
                { key: 'C', label: 'Espero a que mi jefe responda para no equivocarme de prioridad.' },
                { key: 'D', label: 'Le paso una de las tareas a un compañero para liberar carga.' }
            ]
        },
        {
            id: 6,
            module: 'M1',
            type: 'text',
            text: 'Si le pedimos referencias a tu último jefe, ¿qué nos diría que es tu mayor área de oportunidad o debilidad?'
        },
        {
            id: 7,
            module: 'M1',
            type: 'slider',
            text: 'Estilo de trabajo:',
            minLabel: '1 = Prefiero instrucciones exactas paso a paso',
            maxLabel: '10 = Prefiero que me den la meta final y yo resolver cómo llegar'
        },
        {
            id: 8,
            module: 'M1',
            type: 'choice',
            text: 'Recibes una corrección directa y firme de tu supervisor sobre algo en lo que te esforzaste mucho. ¿Qué pasa por tu mente primero?',
            options: [
                { key: 'A', label: 'Busco entender exactamente qué faltó para corregirlo rápido.' },
                { key: 'B', label: 'Siento que no valoran mi esfuerzo y me cuesta mantener el mismo ánimo el resto del día.' },
                { key: 'C', label: 'Explico de inmediato todas las razones externas por las que quedó así.' },
                { key: 'D', label: 'Digo que sí a todo para terminar la plática rápido, aunque no esté de acuerdo.' }
            ]
        },
        {
            id: 9,
            module: 'M1',
            type: 'slider',
            text: 'Tolerancia a la frustración bajo presión:',
            minLabel: '1 = Me estreso fácil y se me nota en el trato',
            maxLabel: '10 = Mantengo la calma y el tono neutral incluso en crisis'
        },
        {
            id: 10,
            module: 'M1',
            type: 'text',
            text: 'Cuéntame de un trabajo donde sentiste que el ambiente era difícil. ¿Qué lo hacía difícil para ti?'
        }
    ],

    // =========================================================================
    // Módulo 2: Coordinadores (Solo Rol = Coordinador - 10 preguntas: IDs 11 - 20)
    // =========================================================================
    module2_coordinador: [
        {
            id: 11,
            module: 'M2',
            type: 'text',
            text: 'Cuéntame de una ocasión en la que tuviste que corregir o levantar un acta a alguien de tu equipo. ¿Qué palabras usaste?'
        },
        {
            id: 12,
            module: 'M2',
            type: 'choice',
            text: 'Un técnico a tu cargo se niega a hacer una revisión argumentando que "ya casi es su hora de salida". ¿Cómo actúas?',
            options: [
                { key: 'A', label: 'Lo hablo en privado, le indico la prioridad operativa y documento la negativa si persiste.' },
                { key: 'B', label: 'Lo hago yo mismo para evitar problemas y no retrasar la unidad.' },
                { key: 'C', label: 'Le llamo la atención frente a los demás para marcar autoridad.' },
                { key: 'D', label: 'Lo dejo ir para no generar un conflicto laboral y lo resuelvo al día siguiente.' }
            ]
        },
        {
            id: 13,
            module: 'M2',
            type: 'slider',
            text: 'Estilo de liderazgo:',
            minLabel: '1 = Cercano y flexible para mantener buen ambiente',
            maxLabel: '10 = Estricto con procesos, métricas y cumplimiento'
        },
        {
            id: 14,
            module: 'M2',
            type: 'text',
            text: 'Describe una vez que un subordinado te retó o se negó a hacer una tarea. ¿Qué hiciste exactamente y cómo terminó?'
        },
        {
            id: 15,
            module: 'M2',
            type: 'choice',
            text: 'Tu jefe directo te da una instrucción operativa que sabes que va a molestar a tus técnicos. ¿Cómo se la bajas al equipo?',
            options: [
                { key: 'A', label: 'La presento como una decisión del área, explico el "para qué" y aseguro su cumplimiento.' },
                { key: 'B', label: 'Les digo que "son órdenes de arriba" y que a mí tampoco me parece, pero hay que hacerla.' },
                { key: 'C', label: 'La aplico a medias para que el equipo no se moleste conmigo.' },
                { key: 'D', label: 'Le pido a mi jefe que venga él a decírselos directamente.' }
            ]
        },
        {
            id: 16,
            module: 'M2',
            type: 'text',
            text: 'Si notas que un técnico tiene fallas recurrentes, ¿cuál es tu proceso paso a paso antes de llegar a una baja?'
        },
        {
            id: 17,
            module: 'M2',
            type: 'slider',
            text: 'Delegación vs. Ejecución:',
            minLabel: '1 = Prefiero hacer las cosas yo para asegurar que queden bien',
            maxLabel: '10 = Exijo resultados a mi equipo y solo intervengo si se traban'
        },
        {
            id: 18,
            module: 'M2',
            type: 'text',
            text: 'Cuéntame de alguna vez que tuviste que desvincular a alguien o manejar una queja laboral tensa. ¿Cómo protegiste a la empresa?'
        },
        {
            id: 19,
            module: 'M2',
            type: 'choice',
            text: 'Un técnico te dice que no sabe resolver una falla común. ¿Qué haces?',
            options: [
                { key: 'A', label: 'Le hago preguntas guía para que él diagnostique y le doy un tiempo límite para reportarme.' },
                { key: 'B', label: 'Tomo la herramienta y lo arreglo yo rápido para ahorrar tiempo.' },
                { key: 'C', label: 'Le pido a otro técnico más hábil que lo haga por él.' },
                { key: 'D', label: 'Le digo que busque en internet y me avise cuando termine.' }
            ]
        },
        {
            id: 20,
            module: 'M2',
            type: 'slider',
            text: 'Confianza en tu equipo a distancia:',
            minLabel: '1 = Necesito estar físicamente ahí para que trabajen',
            maxLabel: '10 = Trabajo con indicadores y revisiones puntuales sin estar encima'
        }
    ],

    // =========================================================================
    // Módulo 3: Técnicos (Solo Rol = Técnico - 10 preguntas: IDs 21 - 30)
    // =========================================================================
    module3_tecnico: [
        {
            id: 21,
            module: 'M3',
            type: 'text',
            text: 'Cuéntame de la falla técnica más extraña o difícil que hayas resuelto. ¿Cómo dedujiste la solución?'
        },
        {
            id: 22,
            module: 'M3',
            type: 'choice',
            text: 'Un operador de autobús te presiona levantando la voz porque su salida se retrasa por tu revisión. ¿Cómo respondes?',
            options: [
                { key: 'A', label: 'Mantengo tono calmado, le doy un tiempo estimado real y sigo enfocado en mi revisión.' },
                { key: 'B', label: 'Le respondo en el mismo tono para que me respete y no me presione.' },
                { key: 'C', label: 'Termino rápido aunque quede a medias para que ya se vaya y deje de molestar.' },
                { key: 'D', label: 'Dejo el trabajo y llamo a mi coordinador para que él lidie con el operador.' }
            ]
        },
        {
            id: 23,
            module: 'M3',
            type: 'slider',
            text: 'Preferencia técnica:',
            minLabel: '1 = Prefiero resolver 10 fallas rutinarias rápidas al día',
            maxLabel: '10 = Prefiero meterme a fondo en 1 falla compleja todo el día'
        },
        {
            id: 24,
            module: 'M3',
            type: 'text',
            text: 'Describe tu proceso mental paso a paso cuando un equipo electrónico que ayer funcionaba, hoy no enciende.'
        },
        {
            id: 25,
            module: 'M3',
            type: 'choice',
            text: 'Tu coordinador te pide instalar un equipo de una forma que sabes que fallará pronto por vibración o calor. ¿Qué haces?',
            options: [
                { key: 'A', label: 'Le muestro el riesgo técnico de forma respetuosa y le propongo una alternativa viable.' },
                { key: 'B', label: 'Lo instalo exactamente como pidió; si falla después, no es mi responsabilidad.' },
                { key: 'C', label: 'Lo instalo a mi manera sin decirle nada para evitar discusiones.' },
                { key: 'D', label: 'Me niego a instalarlo hasta que me lo dé por escrito.' }
            ]
        },
        {
            id: 26,
            module: 'M3',
            type: 'text',
            text: 'Háblame de alguna vez que echaste a perder un equipo o herramienta por error. ¿Qué hiciste después?'
        },
        {
            id: 27,
            module: 'M3',
            type: 'slider',
            text: 'Documentación y relevo:',
            minLabel: '1 = Prefiero solo reparar y avisar de palabra al relevo',
            maxLabel: '10 = Documento cada detalle en bitácora aunque me tome tiempo extra'
        },
        {
            id: 28,
            module: 'M3',
            type: 'choice',
            text: 'Tienes que reparar un equipo hoy mismo pero no tienes la refacción ideal en la base. ¿Qué haces?',
            options: [
                { key: 'A', label: 'Evalúo una solución temporal segura, la valido con mi coordinador y solicito la refacción formalmente.' },
                { key: 'B', label: 'Reporto la unidad como pendiente hasta que llegue la pieza exacta.' },
                { key: 'C', label: 'Improviso con lo que haya a la mano para sacar el trabajo sin avisar.' },
                { key: 'D', label: 'Le quito la pieza a otra unidad que esté estacionada sin reportarlo.' }
            ]
        },
        {
            id: 29,
            module: 'M3',
            type: 'text',
            text: 'Cuéntame de alguna ocasión en la que tuviste que pedir ayuda porque un problema técnico te superó.'
        },
        {
            id: 30,
            module: 'M3',
            type: 'slider',
            text: 'Aprendizaje de nuevas tecnologías:',
            minLabel: '1 = Necesito capacitación formal antes de tocar un equipo nuevo',
            maxLabel: '10 = Leo manuales y aprendo rápido sobre la marcha'
        }
    ],

    // =========================================================================
    // Módulo 4: Auxiliares (Solo Rol = Auxiliar - 10 preguntas: IDs 31 - 40)
    // =========================================================================
    module4_auxiliar: [
        {
            id: 31,
            module: 'M4',
            type: 'text',
            text: 'Describe detalladamente cómo nombras y organizas tus archivos de trabajo para no perderlos.'
        },
        {
            id: 32,
            module: 'M4',
            type: 'choice',
            text: 'Te piden extraer un video urgente de un siniestro, pero tienes otros tres reportes atrasados. ¿Qué haces?',
            options: [
                { key: 'A', label: 'Atiendo de inmediato la urgencia del siniestro y aviso el nuevo horario de entrega de los reportes.' },
                { key: 'B', label: 'Termino primero los reportes atrasados porque llegaron antes.' },
                { key: 'C', label: 'Le pido a mi coordinador que él haga la extracción mientras yo termino mis reportes.' },
                { key: 'D', label: 'Intento hacer todo al mismo tiempo aunque aumente el riesgo de error.' }
            ]
        },
        {
            id: 33,
            module: 'M4',
            type: 'slider',
            text: 'Tolerancia a tareas repetitivas:',
            minLabel: '1 = Me distraigo rápido con tareas rutinarias',
            maxLabel: '10 = Mantengo enfoque y precisión alta en revisiones largas'
        },
        {
            id: 34,
            module: 'M4',
            type: 'text',
            text: 'Cuéntame de alguna vez que perdiste información importante o cometiste un error en un reporte. ¿Cómo lo solucionaste?'
        },
        {
            id: 35,
            module: 'M4',
            type: 'choice',
            text: 'Un técnico de la base no te entrega un disco de grabación que necesitas para un reporte urgente. ¿Cómo procedes?',
            options: [
                { key: 'A', label: 'Se lo solicito con claridad y hora límite; si no lo entrega, escalo el hecho documentado a mi coordinador.' },
                { key: 'B', label: 'Espero a que me lo entregue cuando pueda para no generar roces con él.' },
                { key: 'C', label: 'Voy y lo busco yo mismo en sus cosas o en el autobús sin avisarle.' },
                { key: 'D', label: 'Envío el reporte incompleto poniendo que "el técnico no cooperó".' }
            ]
        },
        {
            id: 36,
            module: 'M4',
            type: 'text',
            text: 'Háblame de una ocasión en la que detectaste un error en un documento o reporte que nadie más había visto.'
        },
        {
            id: 37,
            module: 'M4',
            type: 'choice',
            text: 'Un área externa te exige información por teléfono que, por procedimiento, requiere autorización de tu coordinador. ¿Qué contestas?',
            options: [
                { key: 'A', label: 'Les indico amablemente el procedimiento y les confirmo que en cuanto tenga la autorización se los envío.' },
                { key: 'B', label: 'Se los paso por esta única vez para quedar bien y que no se quejen.' },
                { key: 'C', label: 'Les digo secamente que no puedo y cuelgo.' },
                { key: 'D', label: 'Ignoro la solicitud hasta que se comuniquen con mi coordinador.' }
            ]
        },
        {
            id: 38,
            module: 'M4',
            type: 'slider',
            text: 'Orden y método:',
            minLabel: '1 = Trabajo de forma flexible y busco archivos cuando los necesito',
            maxLabel: '10 = Tengo carpetas, nomenclaturas y respaldos estrictos'
        },
        {
            id: 39,
            module: 'M4',
            type: 'text',
            text: '¿Qué haces si el sistema de almacenamiento o tu computadora falla a la mitad de tu turno?'
        },
        {
            id: 40,
            module: 'M4',
            type: 'slider',
            text: 'Verificación de datos:',
            minLabel: '1 = Confío en mi primera captura para ir más rápido',
            maxLabel: '10 = Reviso dos veces cada cifra antes de enviar un reporte'
        }
    ],

    // =========================================================================
    // Módulo 5: Inteligencia Emocional, Integridad y Adaptabilidad (IDs 41 - 55)
    // En la UI del candidato se titula: "Estilo de Comunicación y Escenarios"
    // =========================================================================
    module5_contrast: [
        // Bloque A: Autoconocimiento y Control Emocional
        {
            id: 41,
            module: 'M5',
            subBlock: 'Bloque A: Autoconocimiento y Control Emocional',
            type: 'choice',
            text: 'Un compañero de trabajo te llama por un apodo o por una forma que te desagrada, frente a otros. ¿Cómo reaccionas?',
            options: [
                { key: 'A', label: 'En privado y con calma le digo que prefiero que me llame por mi nombre.' },
                { key: 'B', label: 'Le contesto con un comentario sarcástico o un apodo igual para que entienda.' },
                { key: 'C', label: 'Me molesto en el momento y le exijo respeto frente a todos.' },
                { key: 'D', label: 'No digo nada para no parecer exagerado, pero desde ese día le corto el trato.' }
            ]
        },
        {
            id: 42,
            module: 'M5',
            subBlock: 'Bloque A: Autoconocimiento y Control Emocional',
            type: 'choice',
            text: 'Cuando alguien en el trabajo te habla de manera grosera o injusta, ¿qué tiende a salir primero en tu forma de comunicarte?',
            options: [
                { key: 'A', label: 'Mantengo tono neutro, marco un límite respetuoso y me enfoco en el hecho concreto.' },
                { key: 'B', label: 'Uso un poco de ironía o humor ácido para hacerle notar su falta de respeto.' },
                { key: 'C', label: 'Me quedo callado, pongo cara seria y me alejo hasta que se me pase.' },
                { key: 'D', label: 'Alzo la voz o respondo cortante en el calor del momento.' }
            ]
        },
        {
            id: 43,
            module: 'M5',
            subBlock: 'Bloque A: Autoconocimiento y Control Emocional',
            type: 'slider',
            text: 'Separación de problemas personales y estabilidad de ánimo:',
            minLabel: '1 = Si tengo un mal día personal se me nota en el trato, en el semblante y mi rendimiento',
            maxLabel: '10 = Mantengo el mismo trato profesional y enfoque sin dar peso a mis problemas durante mi trabajo'
        },
        {
            id: 44,
            module: 'M5',
            subBlock: 'Bloque A: Autoconocimiento y Control Emocional',
            type: 'text',
            text: '¿Qué situaciones o comportamientos de un jefe o compañero suelen desesperarte o hacerte perder la paciencia? ¿Cómo manejas la relación para seguir siendo profesional?'
        },

        // Bloque B: Empatía y Relaciones Interpersonales
        {
            id: 45,
            module: 'M5',
            subBlock: 'Bloque B: Empatía y Relaciones Interpersonales',
            type: 'choice',
            text: 'Un compañero tiene dificultades con su tarea y eso empieza a retrasar tu propio trabajo. ¿Qué haces?',
            options: [
                { key: 'A', label: 'Me acerco a ver dónde está trabado, le ayudo a destrabarlo rápido o avisamos juntos al coordinador.' },
                { key: 'B', label: 'Me enfoco solo en lo mío y dejo evidencia de que el retraso fue culpa suya.' },
                { key: 'C', label: 'Le hago su parte del trabajo para no atrasarme, aunque me moleste.' },
                { key: 'D', label: 'Lo reporto de inmediato con el jefe sin hablar primero con él.' }
            ]
        },
        {
            id: 46,
            module: 'M5',
            subBlock: 'Bloque B: Empatía y Relaciones Interpersonales',
            type: 'choice',
            text: 'Recibes una instrucción laboral directa de una persona con la que no tienes buena relación personal. ¿Cómo actúas?',
            options: [
                { key: 'A', label: 'Cumplo la instrucción con el mismo estándar profesional que con cualquier otra persona.' },
                { key: 'B', label: 'La cumplo al mínimo necesario para evitar problemas, sin dar nada extra.' },
                { key: 'C', label: 'Busco a otro superior para validar si realmente tengo que hacerle caso.' },
                { key: 'D', label: 'Le respondo de forma cortante para dejarle claro que solo es trabajo.' }
            ]
        },
        {
            id: 47,
            module: 'M5',
            subBlock: 'Bloque B: Empatía y Relaciones Interpersonales',
            type: 'slider',
            text: 'Manejo de desacuerdos:',
            minLabel: '1 = Prefiero decir que sí y aceptar todo para evitar conflictos',
            maxLabel: '10 = Expreso mi desacuerdo con respeto desde el principio'
        },
        {
            id: 48,
            module: 'M5',
            subBlock: 'Bloque B: Empatía y Relaciones Interpersonales',
            type: 'text',
            text: 'Cuéntame de una ocasión real en la que tuviste un desacuerdo fuerte con un compañero o supervisor. ¿Cómo lo resolviste?'
        },

        // Bloque C: Integridad y Responsabilidad (Crítico para Evidencia y Operación)
        {
            id: 49,
            module: 'M5',
            subBlock: 'Bloque C: Integridad y Responsabilidad',
            type: 'choice',
            text: 'Descubres que un compañero cometió un error grave que afecta la entrega de una evidencia o un equipo, pero sabes que reportarlo le causará problemas. ¿Qué haces?',
            options: [
                { key: 'A', label: 'Lo reporto de inmediato por los canales formales; la integridad de la operación y la evidencia va primero.' },
                { key: 'B', label: 'Hablo primero con mi compañero para que él lo reporte hoy mismo; si no lo hace, lo reporto yo.' },
                { key: 'C', label: 'Intento corregirlo en silencio junto con él sin avisar a nadie para no perjudicarlo.' },
                { key: 'D', label: 'No me meto porque no es mi responsabilidad directa y prefiero evitar chismes.' }
            ]
        },
        {
            id: 50,
            module: 'M5',
            subBlock: 'Bloque C: Integridad y Responsabilidad',
            type: 'choice',
            text: 'Un superior te presiona para entregar un reporte o resultado urgentemente, pero sabes que todavía no terminas de verificar la información. ¿Cómo actúas?',
            options: [
                { key: 'A', label: 'Le indico con firmeza y respeto que faltan X minutos para validar los datos y evitar entregar información errónea.' },
                { key: 'B', label: 'Se lo entrego tal cual está y le aclaro por mensaje que "aún no estaba revisado" por si hay fallas.' },
                { key: 'C', label: 'Se lo entrego rápido sin decir nada y cruzo los dedos para que no tenga errores.' },
                { key: 'D', label: 'Le digo que sí, pero me tardo lo necesario sin avisarle cuánto falta.' }
            ]
        },
        {
            id: 51,
            module: 'M5',
            subBlock: 'Bloque C: Integridad y Responsabilidad',
            type: 'choice',
            text: 'Te acusan de un error operativo que en realidad cometió tu compañero. ¿Cómo actúas ante tu jefe?',
            options: [
                { key: 'A', label: 'Presento los hechos y evidencias de mi parte del trabajo con calma, sin atacar personalmente a mi compañero.' },
                { key: 'B', label: 'Confronto a mi compañero frente al jefe para que admita su culpa.' },
                { key: 'C', label: 'Asumo la culpa para no quedar como "chismoso", aunque me dé coraje.' },
                { key: 'D', label: 'Me enojo con el jefe por desconfiar de mí sin investigar primero.' }
            ]
        },

        // Bloque D: Adaptabilidad y Contraste
        {
            id: 52,
            module: 'M5',
            subBlock: 'Bloque D: Adaptabilidad y Contraste',
            type: 'slider',
            text: 'Adaptación a cambios sin previo aviso:',
            minLabel: '1 = Me frustra mucho cuando cambian mis prioridades o procedimientos de golpe',
            maxLabel: '10 = Me ajusto rápido y reorganizo mi turno sin perder el ritmo'
        },
        {
            id: 53,
            module: 'M5',
            subBlock: 'Bloque D: Adaptabilidad y Contraste',
            type: 'choice',
            text: '¿Qué afirmación describe mejor tu relación con las reglas en el trabajo?',
            options: [
                { key: 'A', label: 'Las reglas son la base, pero si hay una emergencia real hay que saber escalar una excepción.' },
                { key: 'B', label: 'Sigo el 100% de las reglas absolutamente siempre, sin ninguna excepción jamás.' },
                { key: 'C', label: 'Las reglas son una guía, pero el sentido común siempre vale más que el manual.' },
                { key: 'D', label: 'Sigo las reglas que tienen sentido; las burocráticas prefiero saltármelas.' }
            ]
        },
        {
            id: 54,
            module: 'M5',
            subBlock: 'Bloque D: Adaptabilidad y Contraste',
            type: 'text',
            text: 'Cuéntame de una ocasión real en la que la presión laboral te superó o tuviste que enfrentar una injusticia en un empleo anterior. ¿Cómo reaccionaste?'
        },
        {
            id: 55,
            module: 'M5',
            subBlock: 'Bloque D: Adaptabilidad y Contraste',
            type: 'text',
            text: 'Si te contratamos hoy y a los tres meses decides renunciar, ¿cuál crees que sería la razón más probable?'
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
 * Construye el cuestionario híbrido completo para el candidato según su rol:
 *  - Módulo 1: Cultura, Actitud y Operación (10 preguntas: IDs 1..10)
 *  - Módulo Específico del Rol (10 preguntas: Coordinador [11..20], Técnico [21..30], Auxiliar [31..40])
 *  - Módulo 5: Inteligencia Emocional, Integridad y Adaptabilidad (15 preguntas: IDs 41..55)
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

    const total = combined.length;

    return combined.map((q, index) => {
        const meta = MODULES_META[q.module];
        return {
            stepNumber: index + 1,
            totalSteps: total,
            id: q.id,
            key: `q_${q.id}`,
            type: q.type || 'text',
            moduleCode: q.module,
            subBlock: q.subBlock || null,
            text: q.text,
            options: q.options || null,
            minLabel: q.minLabel || null,
            maxLabel: q.maxLabel || null,
            sectionUiTitle: meta.uiTitle,
            sectionAdminTitle: meta.adminTitle
        };
    });
}

/**
 * Formatea una respuesta guardada (`rawAnswer`) según el tipo de pregunta (`choice`, `slider`, `text`)
 * tanto para visualización en el Modal de Admin como para el Prompt de Análisis con IA y el CSV.
 */
export function formatAnswerForDisplay(question, rawAnswer) {
    const val = String(rawAnswer ?? '').trim();
    if (!val) {
        return {
            hasAnswer: false,
            shortText: 'Sin respuesta registrada.',
            aiText: '[SIN RESPUESTA]',
            badgeType: question.type
        };
    }

    if (question.type === 'choice' && Array.isArray(question.options)) {
        const found = question.options.find((opt) => opt.key.toUpperCase() === val.toUpperCase());
        if (found) {
            const formatted = `Opción ${found.key}) ${found.label}`;
            return {
                hasAnswer: true,
                shortText: formatted,
                aiText: `**${found.key})** ${found.label}`,
                choiceKey: found.key,
                choiceLabel: found.label,
                badgeType: 'choice'
            };
        }
    }

    if (question.type === 'slider') {
        const num = Number(val);
        const cleanNum = !Number.isNaN(num) ? num : val;
        const scaleContext = `(${question.minLabel}  ⟷  ${question.maxLabel})`;
        return {
            hasAnswer: true,
            shortText: `Nivel seleccionado: ${cleanNum} / 10`,
            scaleContext,
            aiText: `**${cleanNum} / 10** — *Escala: [${question.minLabel}] a [${question.maxLabel}]*`,
            sliderValue: cleanNum,
            badgeType: 'slider'
        };
    }

    // Por defecto: 'text'
    return {
        hasAnswer: true,
        shortText: val,
        aiText: val,
        badgeType: 'text'
    };
}
