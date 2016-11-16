# OKa (Youtube Player)

OKa permite buscas simples e reprodução de vídeos do YouTube. Seu grande diferencial é armazenar esses vídeos em cache e permitir sua reprodução após sem conexão a internet.

## Busca Karaoke
Desenvolvido com muito carinho aos amantes de Karoke, OKa tem o modo de busca "Karaoke", que filtra vídeos do gênero.

## Baixe e execute
Baixe e aproveite em um computador com Linux ou Windows:
https://www.dropbox.com/sh/mplcollalhsezdt/AACIgElDzsJg6b7LtUozOxTNa?dl=0

## Build
```
mkdir build
cd build/
../node_modules/.bin/electron-packager ../app/ --platform=linux --app-version=0.3.2
../node_modules/.bin/electron-packager ../app/ --platform=win32 --app-version=0.3.2 --icon=../app/icon.ico
```

Atenção: O build para o Windows deve ser feita no mesmo. O binário correto para Windows do youtube-dl só é baixada utilizando o Windows.

## Somos livre
OKa é uma aplicação de código aberto desenvolvida com Electron, NodeJs e outras tecnologias web.
