# Converte dist-single/index.html em um fragmento (sem <html>/<head>/<body>) para publicar como Artifact.
import re, sys
src = open(sys.argv[1], encoding='utf-8').read()
head = re.search(r'<head>(.*?)</head>', src, re.S).group(1)
body = re.search(r'<body>(.*)</body>', src, re.S).group(1)
keep = []
keep.append(re.search(r'<title>.*?</title>', head).group(0))
keep.append('<meta name="claude:viewport-fit-sides" content="cover">')
keep += re.findall(r'<link[^>]+fonts\.googleapis\.com/css2[^>]*>', head)
keep += re.findall(r'<style[^>]*>.*?</style>', head, re.S)
scripts = re.findall(r'<script type="module"[^>]*>.*?</script>', head, re.S)
out = '\n'.join(keep) + '\n' + body.strip() + '\n' + '\n'.join(scripts) + '\n'
open(sys.argv[2], 'w', encoding='utf-8').write(out)
print(len(out))
