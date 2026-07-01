const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

// Hafıza depoları
const aktifKullanicilar = {};
const sesKullanicilari = {}; // Ses odasındakileri tutar: { socketId: { isim, micAcik, kulaklikAcik } }

io.on('connection', (socket) => {

    // 1. Kullanıcı odaya ilk girdiğinde
    socket.on('kullanici-katildi', (isim) => {
        aktifKullanicilar[socket.id] = isim;
        io.emit('sistem-mesaji', `${isim} odaya katıldı 👋`);
    });

    // 2. Mesajlaşma alanı
    socket.on('mesaj-gonder', (veri) => {
        io.emit('mesaj-al', veri);
    });

    // 3. Yazıyor sinyali
    socket.on('yaziyor-sinyali', (veri) => {
        socket.broadcast.emit('kullanici-yaziyor', veri);
    });

    // 🎙️ 4. SESE KATILMA SİNYALİ (YENİ)
    socket.on('sese-katil', (veri) => {
        sesKullanicilari[socket.id] = {
            isim: veri.isim,
            micAcik: veri.micAcik,
            kulaklikAcik: veri.kulaklikAcik
        };
        // Güncel ses listesini herkese gönder
        io.emit('ses-kullanicilari-guncelle', sesKullanicilari);
    });

    // 🎙️ 5. SESTEN AYRILMA SİNYALİ (YENİ)
    socket.on('sesten-ayril', () => {
        if (sesKullanicilari[socket.id]) {
            delete sesKullanicilari[socket.id];
            io.emit('ses-kullanicilari-guncelle', sesKullanicilari);
        }
    });

    // 🎙️ 6. MİKROFON / KULAKLIK DURUM GÜNCELLEME (YENİ)
    socket.on('ses-durumu-guncelle', (veri) => {
        if (sesKullanicilari[socket.id]) {
            sesKullanicilari[socket.id].micAcik = veri.micAcik;
            sesKullanicilari[socket.id].kulaklikAcik = veri.kulaklikAcik;
            io.emit('ses-kullanicilari-guncelle', sesKullanicilari);
        }
    });

    // 7. Bağlantı koptuğunda (Sekme kapatıldığında)
    socket.on('disconnect', () => {
        const ayrilanIsim = aktifKullanicilar[socket.id];
        if (ayrilanIsim) {
            io.emit('sistem-mesaji', `${ayrilanIsim} odadan çıktı 🚪`);
            delete aktifKullanicilar[socket.id];
        }
        
        // Eğer sesteyken çat diye sekmeyi kapattıysa ses listesinden de sil
        if (sesKullanicilari[socket.id]) {
            delete sesKullanicilari[socket.id];
            io.emit('ses-kullanicilari-guncelle', sesKullanicilari);
        }
    });
});

http.listen(3000, () => {
    console.log('Sistem hazır! http://localhost:3000');
});