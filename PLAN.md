# Multimodal Gene-Brain Integration Project — 구현 플랜

## 목표
- 중앙 repo: **`allison-eunse/gene-brain`**
- 각자 개인 프로젝트 repo는 **소스는 그대로** 두고, 중앙으로는 **tracking artifacts만** 모음
  - on push: 커밋 메타데이터(JSON)
  - end-of-day: 본인 검토 후 daily markdown 수동 publish
- GitHub Pages 대시보드 제공
  - **Home**: 프로젝트 소개 + overview PNG + 팀 구성/역할 표
  - **Commits**: 사람/레포별 최신 커밋 카드(고정 높이 + 내부 스크롤)
  - **Daily Logs**: 날짜별 로그 목록 + 마크다운 뷰어

## 핵심 규칙(고정)

### Per-repo key (자동, 사람 입력 없음)
```
OWNER = github.repository_owner
REPO  = github.event.repository.name
KEY   = OWNER + "__" + REPO
```

### Commits feed destination (central)
- Path: `site/data/<KEY>/commits.json`
- Rolling window: **최근 50개**
- 포함 필드(최소화): `sha_short`, `message`, `committed_at`

### Daily logs destination (central)
- Path: `team-tracking/<owner>/<repo>/daily/YYYY-MM-DD.md`
- 개인 프로젝트 repo에선 `TODAY.md`는 로컬에서만 관리 (`.gitignore`)

## Pages 가시성
- **선호**: repo를 private로 전환 후 Pages를 org-only/private로 유지
- **Fallback**: org-only/private Pages가 불가하면, Pages는 public으로 운영

## Refresh UX
- **Commits 페이지**
  - Manual: Refresh 버튼
  - Auto: 3시간마다 데이터 re-fetch + re-render
  - `Last updated` 표시
- **Daily Logs 페이지**
  - Manual: Refresh 버튼
  - Auto: 매일 18:00 KST에 1회 re-fetch + re-render
  - `Last updated` 표시

## 보안 원칙
- 중앙 Pages/데이터에 **코드/파일 내용/diff를 절대 포함하지 않음**
- 커밋 메시지는 **1줄만** + 길이 제한(120자)
- email/토큰/CI 로그/환경변수 등 노출 금지
- UI에 **repo URL 링크는 숨김**, repo name만 표시

## JSON Schemas

### commits.json
```json
{
  "owner": "string",
  "repo": "string",
  "updated_at": "ISO8601",
  "commits": [
    {
      "sha_short": "abc1234",
      "message": "First line of commit message (max 120 chars)",
      "committed_at": "ISO8601"
    }
  ]
}
```

### daily-index.json (generated at build)
```json
{
  "<owner>__<repo>": [
    "2026-01-19",
    "2026-01-18"
  ]
}
```

### projects.json (roster)
```json
{
  "projects": [
    {
      "key": "owner__repo",
      "display_name": "Project Display Name",
      "member": "Member Name",
      "component": "Research Component",
      "owner": "github-owner",
      "repo": "repo-name"
    }
  ]
}
```

---

## Requests (cross-agent communication)

_If you need changes in another agent's directory, add a request here._

<!-- Example:
### Request from Agent C (UI)
- Need `daily-index.json` to include `title` field extracted from first H1 of each md file.
-->

