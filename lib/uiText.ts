import type { QuestionKind } from '@/types'

export const UI_TEXT = {
  app: {
    name: 'pre-spec',
    tagline: 'LDD Interview Workbench',
    sectionCount: (n: number) => `${n} セクション`,
    downloadAll: '↓ 成果物ダウンロード',
    downloadProjectJson: '↓ project.json 保存',
    settings: '⚙ 設定',
    generateTimelineError: '質問の生成に失敗しました。APIキーを確認してください。',
    downloadTimelineFilename: 'タイムライン.md',
    downloadMemoFilename: '参照.md',
    downloadMemoFallback: '# 参照\n\n(空)\n',
    downloadProjectJsonFilename: 'pre-spec.project.json',
  },

  startScreen: {
    promptLabel: 'どんな機能を作りますか?',
    promptPlaceholder: '例: ユーザーが音声メモを録音して、AIが文字起こしと要約を行う機能',
    shortcutHint: '⌘Enter でも開始できます',
    startButton: 'pre-spec を始める',
    startButtonLoading: 'AIが仕様を生成中…',
    generatingNote: 'LLMが初期仕様を生成しています。失敗時はテンプレートで開始します。',
    storageNote: '作業状態は自動保存されます',
    openProjectJson: 'project.json を開く',
    openProjectJsonError: 'project.json の読み込みに失敗しました。ファイル形式を確認してください。',
    openProjectJsonLoading: '読み込み中…',
  },

  specEditor: {
    fileLabel: 'spec.md',
    editMode: 'Edit',
    previewMode: 'Preview',
  },

  bottomTabs: {
    logTab: 'タイムライン.md',
    memoTab: '参照.md',
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
