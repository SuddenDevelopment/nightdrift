flowchart LR
  entry["Page entry"]
  app["App lifecycle"]
  scene["Scene renderer"]
  audio["Audio engine"]
  ui["UI overlays"]
  test_api["Test API"]
  build["Vite build"]
  verify["Verify scripts"]
  lint["Lint"]
  typecheck["Typecheck"]
  unit_tests["Unit tests"]
  e2e["E2E suite"]
  size_gate["Size gate"]
  ci["CI workflow"]
  factory["Factory records"]
  entry --> app
  entry -->|stylesheet| ui
  app --> scene
  app --> audio
  app --> ui
  app -->|installed only under ?test=1| test_api
  ui -->|status copy| audio
  build -->|bundles, injects version| entry
  build -->|dist/ JavaScript| size_gate
  verify --> lint
  verify --> typecheck
  verify --> unit_tests
  verify --> build
  verify --> e2e
  verify --> size_gate
  unit_tests -->|imports measure| size_gate
  unit_tests -->|asserts script order| verify
  e2e -->|fresh preview on 4173| build
  e2e -->|reads window.__nightdrift| test_api
  ci -->|npm run verify| verify
  factory -->|capture contract| app
  factory -->|acceptance command| verify
  style entry fill:#e8eef6,stroke:#2e8f5b,color:#0f172a
  style app fill:#e8eef6,stroke:#2b72b8,color:#0f172a
  style scene fill:#e8eef6,stroke:#2e8f5b,color:#0f172a
  style audio fill:#e8eef6,stroke:#2b72b8,color:#0f172a
  style ui fill:#e8eef6,stroke:#2e8f5b,color:#0f172a
  style test_api fill:#e8eef6,stroke:#2b72b8,color:#0f172a
  style build fill:#e8eef6,stroke:#a8720a,color:#0f172a
  style verify fill:#e8eef6,stroke:#a8720a,color:#0f172a
  style lint fill:#e8eef6,stroke:#a8720a,color:#0f172a
  style typecheck fill:#e8eef6,stroke:#a8720a,color:#0f172a
  style unit_tests fill:#e8eef6,stroke:#a8720a,color:#0f172a
  style e2e fill:#e8eef6,stroke:#a8720a,color:#0f172a
  style size_gate fill:#e8eef6,stroke:#a8720a,color:#0f172a
  style ci fill:#e8eef6,stroke:#2b72b8,color:#0f172a
  style factory fill:#e8eef6,stroke:#c03434,color:#0f172a
  linkStyle 0 stroke:#2e8f5b,fill:#ffffff,color:#0f172a
  linkStyle 1 stroke:#2e8f5b,fill:#ffffff,color:#0f172a
  linkStyle 2 stroke:#2b72b8,fill:#ffffff,color:#0f172a
  linkStyle 3 stroke:#2b72b8,fill:#ffffff,color:#0f172a
  linkStyle 4 stroke:#2b72b8,fill:#ffffff,color:#0f172a
  linkStyle 5 stroke:#2b72b8,fill:#ffffff,color:#0f172a
  linkStyle 6 stroke:#2e8f5b,fill:#ffffff,color:#0f172a
  linkStyle 7 stroke:#a8720a,fill:#ffffff,color:#0f172a
  linkStyle 8 stroke:#a8720a,fill:#ffffff,color:#0f172a
  linkStyle 9 stroke:#a8720a,fill:#ffffff,color:#0f172a
  linkStyle 10 stroke:#a8720a,fill:#ffffff,color:#0f172a
  linkStyle 11 stroke:#a8720a,fill:#ffffff,color:#0f172a
  linkStyle 12 stroke:#a8720a,fill:#ffffff,color:#0f172a
  linkStyle 13 stroke:#a8720a,fill:#ffffff,color:#0f172a
  linkStyle 14 stroke:#a8720a,fill:#ffffff,color:#0f172a
  linkStyle 15 stroke:#a8720a,fill:#ffffff,color:#0f172a
  linkStyle 16 stroke:#a8720a,fill:#ffffff,color:#0f172a
  linkStyle 17 stroke:#a8720a,fill:#ffffff,color:#0f172a
  linkStyle 18 stroke:#a8720a,fill:#ffffff,color:#0f172a
  linkStyle 19 stroke:#2b72b8,fill:#ffffff,color:#0f172a
  linkStyle 20 stroke:#c03434,fill:#ffffff,color:#0f172a
  linkStyle 21 stroke:#c03434,fill:#ffffff,color:#0f172a
%% paths entry: index.html, src/main.ts, src/env.d.ts
%% paths app: src/app.ts
%% paths scene: src/scene.ts
%% paths audio: src/audio.ts
%% paths ui: src/ui.ts, src/style.css
%% paths test_api: src/test-api.ts
%% paths build: vite.config.ts
%% paths verify: package.json, package-lock.json
%% paths lint: eslint.config.js
%% paths typecheck: tsconfig.json
%% paths unit_tests: tests/tooling.test.ts
%% paths e2e: tests/e2e, playwright.config.ts
%% paths size_gate: scripts/size.mjs
%% paths ci: .github/workflows
%% paths factory: .factory
%% mermaid-editor: {"direction":"LR","nodes":[{"id":"entry","label":"Page entry","paths":["index.html","src/main.ts","src/env.d.ts"],"fill":"#e8eef6","color":"#0f172a","stroke":"#2e8f5b","x":1440,"y":30},{"id":"app","label":"App lifecycle","paths":["src/app.ts"],"fill":"#e8eef6","color":"#0f172a","stroke":"#2b72b8","x":1720,"y":30},{"id":"scene","label":"Scene renderer","paths":["src/scene.ts"],"fill":"#e8eef6","color":"#0f172a","stroke":"#2e8f5b","x":2000,"y":30},{"id":"audio","label":"Audio engine","paths":["src/audio.ts"],"fill":"#e8eef6","color":"#0f172a","stroke":"#2b72b8","x":2280,"y":30},{"id":"ui","label":"UI overlays","paths":["src/ui.ts","src/style.css"],"fill":"#e8eef6","color":"#0f172a","stroke":"#2e8f5b","x":2000,"y":180},{"id":"test_api","label":"Test API","paths":["src/test-api.ts"],"fill":"#e8eef6","color":"#0f172a","stroke":"#2b72b8","x":2000,"y":330},{"id":"build","label":"Vite build","paths":["vite.config.ts"],"fill":"#e8eef6","color":"#0f172a","stroke":"#a8720a","x":1160,"y":30},{"id":"verify","label":"Verify scripts","paths":["package.json","package-lock.json"],"fill":"#e8eef6","color":"#0f172a","stroke":"#a8720a","x":600,"y":30},{"id":"lint","label":"Lint","paths":["eslint.config.js"],"fill":"#e8eef6","color":"#0f172a","stroke":"#a8720a","x":880,"y":30},{"id":"typecheck","label":"Typecheck","paths":["tsconfig.json"],"fill":"#e8eef6","color":"#0f172a","stroke":"#a8720a","x":880,"y":180},{"id":"unit_tests","label":"Unit tests","paths":["tests/tooling.test.ts"],"fill":"#e8eef6","color":"#0f172a","stroke":"#a8720a","x":320,"y":30},{"id":"e2e","label":"E2E suite","paths":["tests/e2e","playwright.config.ts"],"fill":"#e8eef6","color":"#0f172a","stroke":"#a8720a","x":880,"y":330},{"id":"size_gate","label":"Size gate","paths":["scripts/size.mjs"],"fill":"#e8eef6","color":"#0f172a","stroke":"#a8720a","x":1440,"y":180},{"id":"ci","label":"CI workflow","paths":[".github/workflows"],"fill":"#e8eef6","color":"#0f172a","stroke":"#2b72b8","x":40,"y":30},{"id":"factory","label":"Factory records","paths":[".factory"],"fill":"#e8eef6","color":"#0f172a","stroke":"#c03434","x":40,"y":180}],"edges":[{"id":"e1","source":"entry","target":"app","sourceHandle":"right","targetHandle":"left","kind":"serial","bidirectional":false,"label":"","fill":"#ffffff","color":"#0f172a","stroke":"#2e8f5b"},{"id":"e2","source":"entry","target":"ui","sourceHandle":"right","targetHandle":"left","kind":"serial","bidirectional":false,"label":"stylesheet","fill":"#ffffff","color":"#0f172a","stroke":"#2e8f5b"},{"id":"e3","source":"app","target":"scene","sourceHandle":"right","targetHandle":"left","kind":"serial","bidirectional":false,"label":"","fill":"#ffffff","color":"#0f172a","stroke":"#2b72b8"},{"id":"e4","source":"app","target":"audio","sourceHandle":"right","targetHandle":"left","kind":"serial","bidirectional":false,"label":"","fill":"#ffffff","color":"#0f172a","stroke":"#2b72b8"},{"id":"e5","source":"app","target":"ui","sourceHandle":"right","targetHandle":"left","kind":"serial","bidirectional":false,"label":"","fill":"#ffffff","color":"#0f172a","stroke":"#2b72b8"},{"id":"e6","source":"app","target":"test_api","sourceHandle":"right","targetHandle":"left","kind":"serial","bidirectional":false,"label":"installed only under ?test=1","fill":"#ffffff","color":"#0f172a","stroke":"#2b72b8"},{"id":"e7","source":"ui","target":"audio","sourceHandle":"right","targetHandle":"left","kind":"serial","bidirectional":false,"label":"status copy","fill":"#ffffff","color":"#0f172a","stroke":"#2e8f5b"},{"id":"e8","source":"build","target":"entry","sourceHandle":"right","targetHandle":"left","kind":"serial","bidirectional":false,"label":"bundles, injects version","fill":"#ffffff","color":"#0f172a","stroke":"#a8720a"},{"id":"e9","source":"build","target":"size_gate","sourceHandle":"right","targetHandle":"left","kind":"serial","bidirectional":false,"label":"dist/ JavaScript","fill":"#ffffff","color":"#0f172a","stroke":"#a8720a"},{"id":"e10","source":"verify","target":"lint","sourceHandle":"right","targetHandle":"left","kind":"serial","bidirectional":false,"label":"","fill":"#ffffff","color":"#0f172a","stroke":"#a8720a"},{"id":"e11","source":"verify","target":"typecheck","sourceHandle":"right","targetHandle":"left","kind":"serial","bidirectional":false,"label":"","fill":"#ffffff","color":"#0f172a","stroke":"#a8720a"},{"id":"e12","source":"verify","target":"unit_tests","sourceHandle":"right","targetHandle":"left","kind":"serial","bidirectional":false,"label":"","fill":"#ffffff","color":"#0f172a","stroke":"#a8720a"},{"id":"e13","source":"verify","target":"build","sourceHandle":"right","targetHandle":"left","kind":"serial","bidirectional":false,"label":"","fill":"#ffffff","color":"#0f172a","stroke":"#a8720a"},{"id":"e14","source":"verify","target":"e2e","sourceHandle":"right","targetHandle":"left","kind":"serial","bidirectional":false,"label":"","fill":"#ffffff","color":"#0f172a","stroke":"#a8720a"},{"id":"e15","source":"verify","target":"size_gate","sourceHandle":"right","targetHandle":"left","kind":"serial","bidirectional":false,"label":"","fill":"#ffffff","color":"#0f172a","stroke":"#a8720a"},{"id":"e16","source":"unit_tests","target":"size_gate","sourceHandle":"right","targetHandle":"left","kind":"serial","bidirectional":false,"label":"imports measure","fill":"#ffffff","color":"#0f172a","stroke":"#a8720a"},{"id":"e17","source":"unit_tests","target":"verify","sourceHandle":"right","targetHandle":"left","kind":"serial","bidirectional":false,"label":"asserts script order","fill":"#ffffff","color":"#0f172a","stroke":"#a8720a"},{"id":"e18","source":"e2e","target":"build","sourceHandle":"right","targetHandle":"left","kind":"serial","bidirectional":false,"label":"fresh preview on 4173","fill":"#ffffff","color":"#0f172a","stroke":"#a8720a"},{"id":"e19","source":"e2e","target":"test_api","sourceHandle":"right","targetHandle":"left","kind":"serial","bidirectional":false,"label":"reads window.__nightdrift","fill":"#ffffff","color":"#0f172a","stroke":"#a8720a"},{"id":"e20","source":"ci","target":"verify","sourceHandle":"right","targetHandle":"left","kind":"serial","bidirectional":false,"label":"npm run verify","fill":"#ffffff","color":"#0f172a","stroke":"#2b72b8"},{"id":"e21","source":"factory","target":"app","sourceHandle":"right","targetHandle":"left","kind":"serial","bidirectional":false,"label":"capture contract","fill":"#ffffff","color":"#0f172a","stroke":"#c03434"},{"id":"e22","source":"factory","target":"verify","sourceHandle":"right","targetHandle":"left","kind":"serial","bidirectional":false,"label":"acceptance command","fill":"#ffffff","color":"#0f172a","stroke":"#c03434"}]}