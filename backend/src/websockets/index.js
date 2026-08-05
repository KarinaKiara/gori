import { Server } from 'socket.io';

export const inicializarWebSockets = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*', // En produccion, reemplazar con el dominio del frontend
      methods: ['GET', 'POST']
    }
  });
  // conexión inicial del cliente mediante WebSockets
  io.on('connection', (socket) => {
    console.log(`Nueva conexión: ${socket.id}`);

    socket.on('unirse-sucursal', (sucursalId) => {
      socket.join(sucursalId);
      console.log(`Socket ${socket.id} se unió a la sucursal ${sucursalId}`);
    });

    // Sala del administrador global: recibe en vivo las solicitudes de insumo de
    // cualquier sucursal (igual que la cocina recibe los pedidos al instante).
    socket.on('unirse-admin', () => {
      socket.join('ADMIN');
      console.log(`Socket ${socket.id} se unió a la sala ADMIN`);
    });

    // Escuchar nuevas ordenes para enviar al KDS
    socket.on('nuevo-pedido', (data) => {
      // Emitir solo a los conectados en esa sucursal
      io.to(data.sucursalId).emit('pedido-recibido', data);
    });

    socket.on('disconnect', () => {
      console.log(`Socket desconectado: ${socket.id}`);
    });
  });

  return io;
};
