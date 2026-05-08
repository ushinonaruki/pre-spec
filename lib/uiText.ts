import type { QuestionKind } from '@/types'

export const UI_TEXT = {
  app: {
    name: 'pre-spec',
    tagline: 'LDD Interview Workbench',
    sectionCount: (n: number) => `${n} セクション`,
    downloadAll: '↓ 成果物ダウンロード',
    downloadProjectJson: '↓ 作業ファイルを保存',
    settings: '⚙ 設定',
    generateTimelineError: '質問の生成に失敗しました。APIキーを確認してください。',
  },

  startScreen: {
    openWorkFile: '作業ファイルを開く',
    openWorkFileLoading: '読み込み中…',
    openWorkFileError: '作業ファイルの読み込みに失敗しました。ファイル形式を確認してください。',
    openWorkFileNameError: 'ファイル名の形式が正しくありません。{projectSlug}.pre-spec.json を選択してください。',
    newProject: '新規作成',
    projectNameLabel: 'プロジェクト名',
    projectNamePlaceholder: '例: user-auth-feature',
    projectNameRequired: 'プロジェクト名を入力してください',
    projectNameInvalid: 'プロジェクト名には英数字が必要です（例: my-feature）',
    requirementMemoLabel: '仕様化したい要件定義メモ',
    requirementMemoPlaceholder: '例: ユーザーが音声メモを録音して、AIが文字起こしと要約を行う機能',
    requirementMemoRequired: '要件定義メモを入力してください',
    relatedLabel: '関連資料（任意）',
    relatedFileButton: 'ファイルを選ぶ (.md / .txt)',
    relatedFileSelected: (name: string) => `選択中: ${name}`,
    relatedNotePlaceholder: '既存仕様・コード・メモなど',
    startButton: '開始',
    startButtonLoading: '開始中…',
    backButton: '戻る',
    storageNote: '作業状態は自動保存されます',
  },

  specEditor: {
    fileLabel: 'spec.md',
    editButton: 'Edit',
    saveButton: '保存して戻る',
    cancelButton: 'キャンセル',
    editModeNote:
      '直接編集モードです。この編集は質問への回答ではなく、manual_edit としてタイムラインに記録されます。',
    memoPlaceholder: '編集メモ (任意)',
  },

  manualEdit: {
    label: 'spec.md を手動編集しました',
    affected: 'affected',
    memo: 'memo',
  },

  bottomTabs: {
    logTab: 'timeline.md',
    memoTab: 'references.md',
    logEmpty: '(まだ記録がありません)',
    memoPlaceholder:
      '参照メモを自由に書いてください。\n\n例:\n## 既存サービス構成\n- manager.py は使っていない\n- Redis は一時状態のみ',
  },

  interview: {
    currentSectionLabel: '現在セクション',
    nextButton: '次へ →',
    addQuestionsButton: '+ 質問を追加',
    addQuestionsLoading: '生成中…',
    nextSectionHint: (title: string) => `次: ${title}`,
    openQuestionsWarning:
      '未回答の質問があります。先に回答するか、スキップして未決事項として残してください。',
    formattingFallbackWarning: '整形に失敗しました。回答をそのまま反映しました。',
    timelineEmpty: '質問タイムラインがまだ生成されていません',
    timelineEmptyHint: '「+ 質問を追加」で生成してください',
    sectionNotFound: 'セクションが見つかりません',
    aiGuessLabel: 'AI推定',
    answerPlaceholder: '回答を入力…',
    answerButton: '回答して反映',
    answerButtonFormatting: '整形中…',
    skipButton: 'スキップ ▾',
    skipReasonLabel: 'スキップ理由',
    skipDetailPlaceholder: 'メモ (任意)',
    skipConfirmButton: 'スキップして記録',
    skipCancelButton: '戻る',
    statusAnswered: '✓',
    statusSkipped: '—',
    statusOpen: '○',
  },

  questionKind: {
    decision: '意思決定',
    constraint: '制約',
    risk: 'リスク',
    scope: 'スコープ',
    data: 'データ',
    flow: 'フロー',
    assumption: '前提',
  } as Record<QuestionKind, string>,

  preflight: {
    title: '出力前チェック',
    openQuestions: 'open 質問',
    skipMarkers: 'skip marker',
    revisitMarkers: 'revisit marker',
    protectedMarkers: 'protected marker',
    warnOpenQuestions: '未回答の質問が残っています。',
    warnSkipMarkers: 'skip marker が残っています。未決事項を含む spec.md として出力されます。',
    warnRevisitMarkers: 'revisit marker が残っています。再確認対象を含む spec.md として出力されます。',
    warnProtectedMarkers: 'protected marker が残っています。保護された内容を含む spec.md として出力されます。',
  },

  initialConfirmation: {
    phaseLabel: 'Initial Setup',
    typeLabel: '初期反映',
    proposedMarkdownLabel: '提案 Markdown',
    okButton: 'OK',
    editAndApplyButton: '修正して反映',
    applyEditButton: '修正して反映',
    applyNote: 'この内容を反映します',
    editPlaceholder: '提案 Markdown を編集…',
    generationError: '初期反映質問の生成に失敗しました',
  },

  settings: {
    title: '設定',
    apiKeyLabel: 'Anthropic API キー',
    apiKeyNote: 'Stage 2 (LLM統合) で使用します。今は未設定でも動作します。',
    saveButton: '保存',
    saveButtonSaved: '✓ 保存しました',
    resetButton: 'プロジェクトをリセット',
    resetConfirm:
      'プロジェクトをリセットしますか？ spec.md・参照・タイムラインがすべて消えます。',
    backButton: 'ワークベンチに戻る',
  },
}
