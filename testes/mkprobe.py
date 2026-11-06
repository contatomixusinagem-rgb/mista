import sys
s=open(sys.argv[1]).read();i=s.rfind('})();')
open(sys.argv[2],'w').write(s[:i]+'window.__T=function(s){return eval(s)};'+s[i:])
