const arrayBufferToString = function(buffer) {
  let str = '';
  for (let iii = 0; iii < buffer.byteLength; iii += 1) {
    str += String.fromCharCode(buffer[iii]);
  }
  return str;
};

const stringToArrayBuffer = function(str) {
  const bytes = new Uint8Array(str.length);
  for (let iii = 0; iii < str.length; iii += 1) {
    bytes[iii] = str.charCodeAt(iii);
  }
  return bytes;
};

// PKCS #8
const pubPEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxUkZZjhAX233DJE1jgs6
AeUJT45JGbWAtEmqKWfnymVAyLHPJdKem/cYqy6yvJmA2z+mYDwcQzgXLqHDeBcj
EBgDbW4kjZcji+jIsvYTSC+XDIj0WAs/H6MnujSk9/WqbB6+CWgqPTqvl/jnDUPY
2yB04s7Rpy0uTBv8HnpWARGxsCuVGF5lGhfX6K6vK8D64ce8snfT3nDgWGYubH02
HR0Z2HnbX0T72vowZ+PnTo2OFcwa0DcNMkBEBeVEYGQI6wq7V57tgud52o+EaHQx
KSsPU81K/6fEdve8cXIyNX1d2feQVQ5gNhAlm8nQx4Fc6157IVToQK0h+3s66w7P
3QIDAQAB
-----END PUBLIC KEY-----`.split('\n').slice(1, -1).
join('');

const verify = async function(text, signature) {
  const pub = await window.crypto.subtle.importKey(
    'spki',
    stringToArrayBuffer(window.atob(pubPEM)), {
      hash: { name: 'SHA-256' },
      name: 'RSASSA-PKCS1-v1_5'
    }, false, ['verify']
  );
  const valid = await window.crypto.subtle.verify(
    { name: 'RSASSA-PKCS1-v1_5' },
    pub,
    stringToArrayBuffer(signature),
    stringToArrayBuffer(text)
  );
  return valid;
};

const generateQR = function() {
  fetch('/idv/gen-qr', {
      method: 'PUT'
  }).
  then((res) => res.json()).
  then((res) => {
    if (res.expiry && res.name && res.signature && res.token) {
      const payload = JSON.stringify({
          expiry: res.expiry,
          name: res.name,
          token: res.token
      });
      verify(payload, window.atob(res.signature)).then((valid) => {
        if (valid) {
          const qr = new QRCode('qr', {
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.L,
            height: 384,
            text: res.token,
            width: 384
          });
          document.getElementById('name').innerText = res.name;
          document.getElementById('expiry').innerText =
          `Expires at ${new Date(res.expiry).toLocaleString('en-us')}`;
        } else {
          document.getElementById('name').innerText =
          'The signature received is invalid!';
        }
      });
    }
  });
};

const indexOnLoad = function() {
  const scan = document.getElementById('qr-scan');
  const initScanQR = function() {
    scan.onclick = null;
    scan.replaceChildren();
    scan.classList.remove('m-2');
    scan.classList.add('ratio', 'ratio-1x1');
    scan.parentElement.classList.add('col-md-9');
    const scanner = new Html5Qrcode('qr-scan');
    console.log(this);
    scanner.start({ facingMode: 'environment' }, {
      aspectRatio: 1,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      fps: 8,
      qrbox: Math.min(400, scan.clientWidth - 20)
    }, function(text) {
      if (Array.isArray(text.
        match(/^(?:[0-9a-f]{32})+\|[0-9a-f]{32}$/u))) {
        scanner.stop().then(() => {
          scan.onclick = initScanQR;
          scan.replaceChildren();
          scan.classList.remove('ratio', 'ratio-1x1');
          const token = document.getElementById('token');
          token.setAttribute('value', text);
          token.parentElement.submit();
        });
      }
    });
  };
  scan.onclick = initScanQR;
};

/* const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
});
let a = privateKey.export({
  format: 'pem',
  type: 'pkcs1'
});
let b = publicKey.export({
  format: 'pem',
  type: 'pkcs1'
}); */

if (typeof module !== 'undefined') {
  module.exports = {
    generateQR,
    indexOnLoad
  };
}
