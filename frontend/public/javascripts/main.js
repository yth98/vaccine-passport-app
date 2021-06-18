// https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
const ab2str = function(buffer) {
  return String.fromCharCode.apply(null, new Uint8Array(buffer));
};

const str2ab = function(str) {
  const bytes = new Uint8Array(str.length);
  for (let iii = 0; iii < str.length; iii += 1) {
    bytes[iii] = str.charCodeAt(iii);
  }
  return bytes;
};

const initKey = async function() {
  const key = await window.crypto.subtle.generateKey(
    {
      hash: { name: 'SHA-256' },
      modulusLength: 2048,
      name: 'RSASSA-PKCS1-v1_5',
      publicExponent: new Uint8Array([
        0x01,
        0x00,
        0x01
      ])
    },
    true, [
      'sign',
      'verify'
    ]
  );
  return {
    priv: window.btoa(ab2str(await window.crypto.subtle.exportKey(
      'pkcs8',
      key.privateKey
    ))),
    pub: window.btoa(ab2str(await window.crypto.subtle.exportKey(
      'spki',
      key.publicKey
    )))
  };
};

const sign = async function(text, privateKey) {
  const priv = await window.crypto.subtle.importKey(
    'pkcs8',
    str2ab(window.atob(privateKey)), {
      hash: { name: 'SHA-256' },
      name: 'RSASSA-PKCS1-v1_5'
    }, false, ['sign']
  );
  const signature = await window.crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    priv,
    str2ab(text)
  );
  return ab2str(signature);
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

const priv1 = '-----BEGIN PRIVATE KEY-----\n';
const priv2 = '\n-----END PRIVATE KEY-----';

const verify = async function(text, signature) {
  const pub = await window.crypto.subtle.importKey(
    'spki',
    str2ab(window.atob(pubPEM)), {
      hash: { name: 'SHA-256' },
      name: 'RSASSA-PKCS1-v1_5'
    }, false, ['verify']
  );
  const valid = await window.crypto.subtle.verify(
    { name: 'RSASSA-PKCS1-v1_5' },
    pub,
    str2ab(signature),
    str2ab(text)
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
    scanner.start({ facingMode: 'environment' }, {
      aspectRatio: 1,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      fps: 8,
      qrbox: Math.min(400, scan.clientWidth - 20)
    }, function(text) {
      if (Array.isArray(text.
        match(/^[0-9A-Za-z+/]+={0,2}\|[0-9a-f]{32}$/u))) {
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

const medInit = async function() {
  const msg = document.getElementById('msg');
  msg.innerText = 'Generating key pair for signature...';
  const key = await initKey();
  msg.innerText = 'Signing the challenge...';
  const chal = document.getElementById('challenge').value;
  const fid = document.getElementById('fid').value;
  const sig = window.btoa(await sign(chal, key.priv));
  msg.innerText = 'Submitting the key pair...';
  fetch('/med/init', {
    body: JSON.stringify({
      chal,
      pub: key.pub,
      sig
    }),
    headers: { 'content-type': 'application/json' },
    method: 'POST'
  }).
  then((res) => res.text()).
  then((res) => {
    if (res === 'Success') {
      msg.innerText = 'Accept!';
      window.localStorage.setItem(fid, key.priv);
      const aa = document.createElement('a');
      aa.download = 'vaccine.pem';
      aa.href = URL.createObjectURL(new Blob(
        [priv1 + key.priv.match(/.{1,64}/gu).join('\n') + priv2],
        { type: 'text/plain' }
      ));
      document.body.appendChild(aa);
      aa.click();
      window.location = '/med';
    } else {
      msg.innerText = 'Reject!';
    }
  });
};

const createOnSubmit = function() {
  // https://stackoverflow.com/a/15148703
  const [form] = document.forms;
  const obj = {};
  [
    'usr_name',
    'id',
    'vaccine_name',
    'date',
    'duration',
    'count',
    'doctor_name',
    'hospital_name'
  ].forEach((key) => {
    obj[key] = form.querySelector(`input[name="${key}"]`).value;
  });
  const fid = document.getElementById('hospital_name').value;
  const priv = window.localStorage.getItem(fid);
  if (priv === null) {
    privKeyImport();
    return false;
  }
  sign(JSON.stringify(obj), priv).then((sig) => {
    document.getElementById('signature').value = window.btoa(sig);
    form.submit();
  });
  return false;
};

const privKeyImport = function() {
  window.alert('Private key is not in Local Storage!');
  const input = document.getElementById('private_key');
  input.onchange = function() {
    if (this.files[0]) {
      const reader = new FileReader();
      reader.readAsText(this.files[0]);
      reader.onload = function(event) {
        const pkcs8 = event.target.result.split('\n').
        filter((line) => line.length && line.indexOf('-') === -1).
        join('');
        if (Array.isArray(pkcs8.match(/^[0-9A-Za-z+/]+={0,2}$/gu))) {
          const fid = document.getElementById('hospital_name').value;
          window.localStorage.setItem(fid, pkcs8);
          createOnSubmit();
        } else {
          window.alert('Invalid private key!');
        }
      };
    }
  };
  input.click();
};

if (typeof module !== 'undefined') {
  module.exports = {
    generateQR,
    indexOnLoad,
    medInit
  };
}
