const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Variabel sementara (Di production, gunakan Database seperti MongoDB)
let antrianHariIni = {
    tanggal: new Date().toISOString().split('T')[0],
    kuotaMaksimal: 20,
    daftar: []
};

// --- SISTEM REALTIME REBUTAN ANTRIAN ---
io.on('connection', (socket) => {
    console.log('User terkoneksi:', socket.id);

    // Kirim data sisa antrian saat user pertama kali buka web
    socket.emit('updateAntrian', {
        sisa: antrianHariIni.kuotaMaksimal - antrianHariIni.daftar.length,
        total: antrianHariIni.kuotaMaksimal
    });

    // Saat user menekan tombol "Ambil Antrian"
    socket.on('ambilAntrian', (userData) => {
        if (antrianHariIni.daftar.length < antrianHariIni.kuotaMaksimal) {
            const nomorBaru = antrianHariIni.daftar.length + 1;
            antrianHariIni.daftar.push({
                nomor: nomorBaru,
                nama: userData.nama,
                merk_motor: userData.merk_motor
            });

            // Beri tahu user bahwa ia berhasil
            socket.emit('suksesAntri', { nomor: nomorBaru });

            // UPDATE REALTIME ke SEMUA user yang sedang buka web
            io.emit('updateAntrian', {
                sisa: antrianHariIni.kuotaMaksimal - antrianHariIni.daftar.length,
                total: antrianHariIni.kuotaMaksimal
            });
        } else {
            // Jika kuota habis (kalah rebutan)
            socket.emit('antrianPenuh', { pesan: 'Maaf, antrian hari ini sudah penuh!' });
        }
    });
});

// --- SISTEM RESET OTOMATIS (CRON JOB) ---
// Dijalankan setiap jam 00:00. Ubah timezone sesuai lokasi: 
// "Asia/Jakarta" (WIB), "Asia/Makassar" (WITA), "Asia/Jayapura" (WIT)
cron.schedule('0 0 * * *', () => {
    console.log('Mereset antrian untuk hari baru...');
    antrianHariIni.daftar = [];
    antrianHariIni.tanggal = new Date().toISOString().split('T')[0];
    
    // Broadcast ke semua klien bahwa antrian sudah direset
    io.emit('updateAntrian', {
        sisa: antrianHariIni.kuotaMaksimal,
        total: antrianHariIni.kuotaMaksimal
    });
}, {
    scheduled: true,
    timezone: "Asia/Jakarta" 
});

server.listen(3000, () => {
    console.log('Server Bengkel berjalan di port 3000');
});