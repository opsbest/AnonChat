# anon-chat

Kayıt yok, profil yok, e-posta yok. Siteye gir, otomatik bir takma ad (callsign) al, tek genel odada anonim şekilde konuş. Sayfayı yenilediğinde (F5) o ana kadarki mesajlar ekranından silinir — sunucu hiçbir mesajı kalıcı olarak saklamaz.

## Özellikler

- **Sıfır kayıt / sıfır giriş** — siteye giren herkese otomatik `GHOST-42` tarzı rastgele bir takma ad atanır.
- **Kalıcı depolama yok** — mesajlar veritabanına yazılmaz, sadece bağlı istemciler arasında gerçek zamanlı olarak iletilir.
- **Sayfa yenileyince sıfırlanır** — yeni bağlanan/yenileyen bir istemciye geçmiş asla gönderilmez; sohbet o kişi için baştan başlar. Diğer bağlı kullanıcılar konuşmaya kaldığı yerden devam eder.
- **Gerçek zamanlı** — Socket.io üzerinden anlık mesajlaşma, "yazıyor…" göstergesi ve çevrimiçi kullanıcı sayacı.
- **Tek dosyalık basit backend** — Express + Socket.io, harici veritabanı veya bağımlılık yok.

## Teknoloji

- Node.js + [Express](https://expressjs.com/)
- [Socket.io](https://socket.io/) (WebSocket tabanlı gerçek zamanlı iletişim)
- Vanilla HTML / CSS / JS (frontend framework yok)

## Kurulum

```bash
git clone <bu-repo>
cd anon-chat
npm install
npm start
```

Sunucu varsayılan olarak `http://localhost:3000` adresinde çalışır. Farklı bir port için `PORT` ortam değişkenini ayarlayabilirsin:

```bash
PORT=5000 npm start
```

Geliştirme sırasında otomatik yeniden başlatma için:

```bash
npm run dev
```

## Nasıl çalışır?

- Bir kullanıcı bağlandığında sunucu, yalnızca o soket bağlantısı için geçerli rastgele bir callsign üretir (örn. `NEON-17`). Bu bilgi hiçbir yerde saklanmaz.
- Gönderilen her mesaj, sunucu tarafında herhangi bir listeye/dosyaya/veritabanına yazılmadan doğrudan diğer tüm bağlı istemcilere yayınlanır (`io.emit`).
- Yeni bağlanan veya sayfasını yenileyen bir istemciye geçmiş mesajlar **gönderilmez**; bu da "F5 atınca sil" davranışını doğal olarak sağlar.

## Dağıtım (Deploy)

Herhangi bir Node.js barındırma servisinde (Render, Railway, Fly.io, bir VPS vb.) çalıştırılabilir. WebSocket bağlantılarına izin verildiğinden emin ol. Statik bir dosya barındırma servisi (yalnızca Vercel/Netlify statik plan gibi) **yeterli değildir**, çünkü sürekli açık bir Node.js sunucusu gerekir.

## Katkıda bulunma

Pull request'ler ve issue'lar açıktır. Fikirler: oda bazlı sohbet, kelime filtresi, hız sınırlama (rate limiting), mobil PWA desteği.

## Lisans

MIT — [LICENSE](LICENSE) dosyasına bakabilirsin.
