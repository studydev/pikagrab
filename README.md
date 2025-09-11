
# 피카츄 잡는 게임

데모 실행: [https://pikagrab.z12.web.core.windows.net/](https://pikagrab.z12.web.core.windows.net/)  
제작 계기: [http://www.studydev.com/development/초등학생-아들-바이브-코딩-01-피카츄-잡기/](http://www.studydev.com/development/초등학생-아들-바이브-코딩-01-피카츄-잡기/)  

이 프로젝트는 HTML, CSS, JavaScript, Supabase를 활용한 바이브코딩 기반의 웹 미니게임입니다.  
캐릭터를 드래그 또는 터치로 움직이(game1)거나 총을 발사(game2)하여 피카츄를 잡고, 점수를 랭킹 보드에 기록할 수 있습니다.  


## 주요 기능

- 마우스/터치로 네모 캐릭터를 드래그하여 이동 가능
- 클릭(또는 모바일 터치)으로 총알 발사, 피카추를 맞추면 점수 획득
- 피카추가 1초마다 랜덤 방향으로 총알을 발사, 맞으면 하트 감소 (game3부터는 점수에 따라 발사 속도가 빨라짐)
- 하트가 모두 사라지면 게임 오버
- 게임 시작 전 사용자 이름 입력 필수(game2부터 적용)
- 게임 종료 시 이름/점수가 Supabase 랭킹 테이블에 저장됨
- 하단에 Top 10 랭킹 보드 표시 (내 점수는 강조)
- "사용자 교체" 버튼으로 언제든 이름을 바꿔서 플레이 가능
- 소스 변경시 GitHub Actions를 통해 Azure Blob Storage 에 서비스 배포
- Azure Blob Storage 의 정적 웹페이지 기능을 활용해서 게임 서비스 제공


## 실행 방법

1. 상단의 데모 링크를 클릭합니다. 
2. 직접 만들고 싶은 경우, 이 Repo를 클론합니다. 프로젝트 폴더로 이동합니다.
3. `game3/index.html` 파일을 웹 브라우저(Chrome 권장)로 엽니다.

> **Supabase 연동:**
> - 이미 Supabase 프로젝트와 랭킹 테이블이 연동되어 있습니다. 
> - 별도의 서버나 DB 설정 없이 바로 랭킹 기능을 사용할 수 있습니다.  

> **Azure Blob Storage 연동:**  
> Github -> Settings -> Security -> secrets and variables -> Actions 메뉴에서 secrets 탭에서 Repository secrets에 `AZURE_STORAGE_ACCOUNT`, `AZURE_STORAGE_KEY`를 추가  
> - Azure Blob Storage -> Security + networking -> Access Keys 메뉴 에서 `Storage account name` 와 `Key1` 을 위 항목에 맞추어 각각 하나씩 추가


## 조작법

- **캐릭터 이동:** 마우스 드래그 또는 터치 드래그
- **총알 발사:** PC는 우클릭, 모바일은 캐릭터 외곽을 터치
- **게임 재시작:** "다시하기" 버튼 클릭
- **사용자 교체:** 하단 "사용자 교체" 버튼 클릭 후 이름 입력


## 라이선스

MIT License로 자유롭게 사용하실 수 있습니다.
이미지가 문제가 될 경우, 아들이나 딸이 직접 손으로 그린 괴생명체 그림으로 대체될 수 있습니다.


## 버전 정보
- game1: 직접 사각형을 드래그하여 피카츄를 잡는 게임
- game2: 사각형 근처를 클릭(터치)하여 총을 쏘아 피카츄를 잡는 게임. 랭킹보드 추가
- game3: 피카츄 미치광이 모드 추가
