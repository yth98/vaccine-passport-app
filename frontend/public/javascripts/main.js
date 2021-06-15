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
                correctLevel: QRCode.CorrectLevel.H,
                height: 128,
                text: res.token,
                width: 128
            });
            document.getElementById('name').innerText = res.name;
            document.getElementById('expiry').innerText =
                `Expires at ${new Date(res.expiry).toLocaleString('en-us')}`;
        }
    });
};

if (typeof module !== 'undefined') {
    module.exports = { generateQR };
}
