// Datos del negocio: un solo sitio para cambiarlos. Los leen todas las páginas (window.UAL).
// Solo datos reales y confirmados. Lo que falta va como null con un comentario.
// El HTML también lleva estos datos escritos (para Google y para quien no tenga JS): si cambias algo aquí,
// busca el mismo dato en las páginas.
window.UAL = {
  nombre: 'Urban Art Lab',
  lema: { es: 'Estilo, cuidado y arte en un solo lugar.', ca: 'Estil, cura i art en un sol lloc.' },
  direccion: {
    calle: "Carrer d'Esperanza González, 5",
    cp: '25001',
    ciudad: 'Lleida',
    barrio: 'Cappont',
    lat: 41.6100775,
    lng: 0.6308524,
    mapa: 'https://www.google.com/maps/search/?api=1&query=Urban%20Art%20Lab%20Lleida&query_place_id=ChIJy1bHusThphIRS9b0nYXsJnw',
    aparcar: {
      es: 'Puedes aparcar en el descampado del Atlètic Segre.',
      ca: "Pots aparcar al descampat de l'Atlètic Segre.",
    },
  },
  correo: 'beautyboxurban@gmail.com',
  instagram: 'https://www.instagram.com/urbanartlab.lleida/',
  booksy: 'https://booksy.com/es-es/160591_urban-art-lab-s-l_servicios-profesionales_51784_lleida',
  pago: { es: 'Tarjeta o efectivo', ca: 'Targeta o efectiu' },
  cancelar: { es: 'Si no puedes venir, avísanos con 24 horas de antelación.', ca: "Si no pots venir, avisa'ns amb 24 hores d'antelació." },
  resenas: {
    // Consultado el 29/09/2026. Actualizar de vez en cuando.
    google: { nota: '4,9', total: 195, enlace: 'https://search.google.com/local/reviews?placeid=ChIJy1bHusThphIRS9b0nYXsJnw' },
    booksy: { nota: '4,98', total: 192 },
  },
  // Horario por día de la semana: 0 domingo … 6 sábado. Cada tramo es [abre, cierra].
  boxes: {
    beauty: {
      nombre: 'Beauty Box',
      equipo: ['Ares', 'Jolanta'],
      telefono: '+34 684 41 33 13',
      tel: '+34684413313',
      whatsapp: '34684413313',
      cita: 'booksy',
      mensaje: {
        es: 'Hola, vengo de la web. Quería pedir cita en Beauty Box para ',
        ca: 'Hola, vinc de la web. Voldria demanar cita a Beauty Box per a ',
      },
      horario: {
        1: [['10:00', '14:00'], ['15:30', '19:30']],
        2: [['10:00', '14:00'], ['15:30', '19:30']],
        3: [['10:00', '14:00'], ['15:30', '19:30']],
        4: [['10:00', '19:30']],
        5: [['10:00', '19:30']],
        6: [],
        0: [],
      },
    },
    barber: {
      nombre: 'Barber Box',
      equipo: ['Hugo', 'Harold'],
      telefono: '+34 672 80 24 27',
      tel: '+34672802427',
      whatsapp: '34672802427',
      cita: 'booksy',
      mensaje: {
        es: 'Hola, vengo de la web. Quería pedir cita en Barber Box para ',
        ca: 'Hola, vinc de la web. Voldria demanar cita a Barber Box per a ',
      },
      horario: {
        1: [['12:00', '20:00']],
        2: [['10:00', '13:30'], ['15:30', '20:00']],
        3: [['12:00', '20:00']],
        4: [['12:00', '20:00']],
        5: [['12:00', '20:00']],
        6: [['08:30', '16:30']],
        0: [],
      },
    },
    tattoo: {
      nombre: 'Tattoo Box',
      equipo: null, // [COMPLETAR: quién tatúa]
      telefono: '+34 672 80 24 27',
      tel: '+34672802427',
      whatsapp: '34672802427',
      cita: 'whatsapp', // o llamada
      precioMinimo: 60,
      mensaje: {
        es: 'Hola, vengo de la web. Quiero pedir cita para un tatuaje. Mi idea es ',
        ca: 'Hola, vinc de la web. Vull demanar cita per a un tatuatge. La meva idea és ',
      },
      // Horario flexible según el tatuaje, con cita. Seguro: 10:00-13:30 y 15:30-20:00.
      // [COMPLETAR: qué días]. Mientras tanto no se calcula «abierto ahora» para el Tattoo Box.
      horarioSeguro: [['10:00', '13:30'], ['15:30', '20:00']],
      horario: null,
    },
  },
};

// Enlace de WhatsApp con el mensaje ya escrito. idioma: 'es' | 'ca'
window.UAL.whatsapp = function (box, idioma) {
  var b = window.UAL.boxes[box];
  return 'https://wa.me/' + b.whatsapp + '?text=' + encodeURIComponent(b.mensaje[idioma || 'es']);
};
