function dig(s){return String(s||"").replace(/\D/g,"")}
function cnpjOk(s){var c=dig(s);if(c.length!==14||/^(\d)\1+$/.test(c))return false;
  function dv(n){var w=n===12?[5,4,3,2,9,8,7,6,5,4,3,2]:[6,5,4,3,2,9,8,7,6,5,4,3,2],t=0;for(var i=0;i<n;i++)t+=+c[i]*w[i];var r=t%11;return r<2?0:11-r}
  return dv(12)===+c[12]&&dv(13)===+c[13]}
function cnpjFmt(s){var c=dig(s);return c.length===14?c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,"$1.$2.$3/$4-$5"):String(s||"").trim()}
function cepFmt(s){var c=dig(s);return c.length===8?c.slice(0,5)+"-"+c.slice(5):String(s||"").trim()}
