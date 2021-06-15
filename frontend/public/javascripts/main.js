const generateQR = function() {
    fetch('/idv/gen-qr', {
        method: 'PUT'
    }).
    then((res) => res.json()).
    then((res) => {
        if (res.expiry && res.name && res.token) {
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
            scanner.stop().then(() => {
                scan.onclick = initScanQR;
                scan.replaceChildren();
                scan.classList.remove('ratio', 'ratio-1x1');
                const token = document.getElementById('token');
                token.setAttribute('value', text);
                token.parentElement.submit();
            });
        });
    };
    scan.onclick = initScanQR;
};

if (typeof module !== 'undefined') {
    module.exports = {
        generateQR,
        indexOnLoad
    };
}
