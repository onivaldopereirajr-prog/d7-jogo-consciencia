export const PLAYTEST_FOCUS_MODE = true

export const PLAYTEST_PRIMARY_VIEWS = ['respiracao', 'meditacao']
export const PLAYTEST_COMPLEMENTARY_VIEWS = ['radio']
export const PLAYTEST_SUPPORT_VIEWS = ['home', 'perfil']

export const PLAYTEST_VISIBLE_VIEW_IDS = [
  'home',
  ...PLAYTEST_PRIMARY_VIEWS,
  ...PLAYTEST_COMPLEMENTARY_VIEWS,
  ...PLAYTEST_SUPPORT_VIEWS,
]

export function isPlaytestParticipantView(viewId) {
  if (!PLAYTEST_FOCUS_MODE) return true
  return PLAYTEST_VISIBLE_VIEW_IDS.includes(viewId)
}
