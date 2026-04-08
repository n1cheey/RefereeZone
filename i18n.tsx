import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AssignmentStatus, ReportStatus, UserRole } from './types';

export type Language = 'en' | 'az' | 'ru';

type TranslationParams = Record<string, string | number | null | undefined>;

interface I18nValue {
  language: Language;
  locale: string;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: TranslationParams) => string;
}

const LANGUAGE_STORAGE_KEY = 'abl-language';

const localeByLanguage: Record<Language, string> = {
  en: 'en-GB',
  az: 'az-Latn-AZ',
  ru: 'ru-RU',
};

const translations: Record<Language, Record<string, string>> = {
  en: {},
  az: {},
  ru: {},
};

Object.assign(translations.en, {
  'language.az': 'AZ',
  'language.en': 'EN',
  'language.ru': 'RU',
  'common.logout': 'Logout',
  'common.loadingPage': 'Loading page...',
  'common.loadingSession': 'Loading session...',
  'common.loading': 'Loading...',
  'common.saving': 'Saving...',
  'common.deleting': 'Deleting...',
  'common.cancel': 'Cancel',
  'common.edit': 'Edit',
  'common.delete': 'Delete',
  'common.submit': 'Submit',
  'common.saveDraft': 'Save Draft',
  'common.gameCode': 'Game Code',
  'common.game': 'Game',
  'common.date': 'Date',
  'common.time': 'Time',
  'common.venue': 'Venue',
  'common.role': 'Role',
  'common.fullName': 'Full Name',
  'common.email': 'Email',
  'common.emailAddress': 'Email Address',
  'common.password': 'Password',
  'common.confirmPassword': 'Confirm Password',
  'common.license': 'License',
  'common.status': 'Status',
  'common.crew': 'Crew',
  'common.toCrew': 'TO Crew',
  'common.matchDetails': 'Match Details',
  'common.finalScore': 'Final score: {score}',
  'common.youtube': 'YouTube',
  'common.gameScoresheet': 'Game Scoresheet',
  'common.notAssigned': 'Not assigned',
  'common.awaitingConfirmation': 'Awaiting confirmation',
  'common.selectReferee': 'Select referee',
  'common.selectOfficial': 'Select official',
  'common.selectTO': 'Select TO',
  'common.sendTo': 'Send To: {name}',
  'common.noRefereeSelected': 'No referee selected',
  'common.recentActivity': 'Recent Activity',
  'role.Instructor': 'Instructor',
  'role.Referee': 'Referee',
  'role.TO': 'TO',
  'role.TO Supervisor': 'TO Supervisor',
  'role.Staff': 'Staff',
  'status.Accepted': 'Accepted',
  'status.Declined': 'Declined',
  'status.Assigned': 'Assigned',
  'status.Pending': 'Pending',
  'status.Draft': 'Draft',
  'status.Submitted': 'Submitted',
  'status.Reviewed': 'Reviewed',
  'status.noReport': 'No Report',
  'slot.referee1': 'Referee',
  'slot.referee2': 'Umpire 1',
  'slot.referee3': 'Umpire 2',
  'slot.refereeN': 'Referee {slotNumber}',
  'slot.to1': 'Scorer',
  'slot.to2': 'Assistant Scorer',
  'slot.to3': 'Timer',
  'slot.to4': '24sec Operator',
  'slot.toN': 'TO {slotNumber}',
  'login.passwordsMismatch': 'Passwords do not match.',
  'login.passwordUpdated': 'Password updated. Sign in with your new password.',
  'login.passwordResetSent': 'Password reset email has been sent. Check your inbox.',
  'login.authenticationFailed': 'Authentication failed.',
  'login.passwordRecovery': 'Password Recovery',
  'login.setNewPassword': 'Set New Password',
  'login.resetYourPassword': 'Reset Your Password',
  'login.resetPassword': 'Reset Password',
  'login.createOfficialAccount': 'Create Official Account',
  'login.signIn': 'Sign In',
  'login.recoveryHelp': 'Enter your new password to complete the recovery process.',
  'login.resetPageHelp': 'Open this page from the reset email. After Supabase validates the recovery link, you can set a new password here.',
  'login.resetHelp': 'Enter your e-mail address and we will send you a password reset link.',
  'login.registerHelp': 'Registration is available only for e-mails and roles approved by Instructor.',
  'login.signInHelp': 'Use your approved ABL account to access nominations, reports and rankings.',
  'login.securePlatform': 'Secure nominations, reports, rankings and member administration for the ABL refereeing staff.',
  'login.fullNamePlaceholder': 'Full name',
  'login.registrationRoleHelp': 'Registration works only for e-mails that were added to the allowed access list with the same role.',
  'login.emailPlaceholder': 'Email',
  'login.passwordHelp': 'Minimum 10 characters. Use a mix of letters and numbers for better security.',
  'login.processing': 'PROCESSING...',
  'login.updatePassword': 'UPDATE PASSWORD',
  'login.sendResetEmail': 'SEND RESET EMAIL',
  'login.register': 'REGISTER',
  'login.signInButton': 'SIGN IN',
  'login.forgotPassword': 'Forgot password?',
  'login.backToSignIn': 'Back to sign in',
  'login.needAccount': 'Need an account?',
  'login.haveAccount': 'Already have an account?',
  'login.registerNow': 'Register now',
  'login.signInNow': 'Sign in now',
});

Object.assign(translations.az, {
  'dashboard.creatingNomination': 'Yaradılır...',
  'dashboard.saveNomination': 'Təyinatı saxla',
  'language.az': 'AZ',
  'language.en': 'EN',
  'language.ru': 'RU',
  'common.logout': 'Г‡Д±xД±Еџ',
  'common.loadingPage': 'SЙ™hifЙ™ yГјklЙ™nir...',
  'common.loadingSession': 'Sessiya yГјklЙ™nir...',
  'common.loading': 'YГјklЙ™nir...',
  'common.saving': 'Yadda saxlanД±lД±r...',
  'common.deleting': 'Silinir...',
  'common.cancel': 'LЙ™Дџv et',
  'common.edit': 'DГјzЙ™liЕџ et',
  'common.delete': 'Sil',
  'common.submit': 'TЙ™sdiqlЙ™',
  'common.saveDraft': 'Qaralama saxla',
  'common.gameCode': 'Oyun kodu',
  'common.game': 'Oyun',
  'common.date': 'Tarix',
  'common.time': 'Saat',
  'common.venue': 'MЙ™kan',
  'common.role': 'Rol',
  'common.fullName': 'Ad soyad',
  'common.email': 'E-poГ§t',
  'common.emailAddress': 'E-poГ§t ГјnvanД±',
  'common.password': 'ЕћifrЙ™',
  'common.confirmPassword': 'ЕћifrЙ™ni tЙ™sdiqlЙ™',
  'common.license': 'Lisenziya',
  'common.status': 'Status',
  'common.crew': 'Brigada',
  'common.toCrew': 'TO heyЙ™ti',
  'common.matchDetails': 'Oyun detallarД±',
  'common.finalScore': 'Yekun hesab: {score}',
  'common.youtube': 'YouTube',
  'common.gameScoresheet': 'Oyun protokolu',
  'common.notAssigned': 'TЙ™yin edilmЙ™yib',
  'common.awaitingConfirmation': 'TЙ™sdiq gГ¶zlЙ™nilir',
  'common.selectReferee': 'Hakim seГ§in',
  'common.selectOfficial': 'RЙ™smi ЕџЙ™xs seГ§in',
  'common.selectTO': 'TO seГ§in',
  'common.sendTo': 'GГ¶ndЙ™rilir: {name}',
  'common.noRefereeSelected': 'Hakim seГ§ilmЙ™yib',
  'common.recentActivity': 'Son aktivlik',
  'role.Instructor': 'Д°nstruktor',
  'role.Referee': 'Hakim',
  'role.TO': 'TO',
  'role.TO Supervisor': 'TO Supervisor',
  'role.Staff': 'Personal',
  'status.Accepted': 'QЙ™bul edildi',
  'status.Declined': 'Д°mtina edildi',
  'status.Assigned': 'TЙ™yin edildi',
  'status.Pending': 'GГ¶zlЙ™yir',
  'status.Draft': 'Qaralama',
  'status.Submitted': 'GГ¶ndЙ™rildi',
  'status.Reviewed': 'YoxlanД±ldД±',
  'status.noReport': 'Report yoxdur',
  'slot.referee1': 'BaЕџ Hakim',
  'slot.referee2': 'KГ¶mЙ™kГ§i Hakim 1',
  'slot.referee3': 'KГ¶mЙ™kГ§i Hakim 2',
  'slot.refereeN': 'Hakim {slotNumber}',
  'slot.to1': 'Katib',
  'slot.to2': 'Katib kГ¶mЙ™kГ§isi',
  'slot.to3': 'Tablo',
  'slot.to4': '24/14 operator',
  'slot.toN': 'TO {slotNumber}',
  'login.passwordsMismatch': 'ЕћifrЙ™lЙ™r uyДџun gЙ™lmir.',
  'login.passwordUpdated': 'ЕћifrЙ™ yenilЙ™ndi. Yeni ЕџifrЙ™nizlЙ™ daxil olun.',
  'login.passwordResetSent': 'ЕћifrЙ™ sД±fД±rlama mЙ™ktubu gГ¶ndЙ™rildi. GЙ™lЙ™n qutunu yoxlayД±n.',
  'login.authenticationFailed': 'Autentifikasiya uДџursuz oldu.',
  'login.passwordRecovery': 'ЕћifrЙ™ bЙ™rpasД±',
  'login.setNewPassword': 'Yeni ЕџifrЙ™ tЙ™yin et',
  'login.resetYourPassword': 'ЕћifrЙ™nizi sД±fД±rlayД±n',
  'login.resetPassword': 'ЕћifrЙ™ni sД±fД±rla',
  'login.createOfficialAccount': 'RЙ™smi hesab yarat',
  'login.signIn': 'Daxil ol',
  'login.recoveryHelp': 'BЙ™rpa prosesini bitirmЙ™k ГјГ§Гјn yeni ЕџifrЙ™nizi daxil edin.',
  'login.resetPageHelp': 'Bu sЙ™hifЙ™ni sД±fД±rlama mЙ™ktubundakД± linkdЙ™n aГ§Д±n. Supabase linki tЙ™sdiqlЙ™dikdЙ™n sonra burada yeni ЕџifrЙ™ qura bilЙ™rsiniz.',
  'login.resetHelp': 'E-poГ§t ГјnvanД±nД±zД± daxil edin, sizЙ™ ЕџifrЙ™ sД±fД±rlama linki gГ¶ndЙ™rЙ™k.',
  'login.registerHelp': 'Qeydiyyat yalnД±z instruktor tЙ™rЙ™findЙ™n tЙ™sdiqlЙ™nmiЕџ e-poГ§t vЙ™ rollar ГјГ§Гјn mГјmkГјndГјr.',
  'login.signInHelp': 'TЙ™yinatlara, reportlara vЙ™ reytinqЙ™ daxil olmaq ГјГ§Гјn tЙ™sdiqlЙ™nmiЕџ ABL hesabД±nД±zdan istifadЙ™ edin.',
  'login.securePlatform': 'ABL hakimlЙ™ri ГјГ§Гјn tЙ™yinat, report, reytinq vЙ™ Гјzv idarЙ™etmЙ™ platformasД±.',
  'login.fullNamePlaceholder': 'Ad soyad',
  'login.registrationRoleHelp': 'Qeydiyyat yalnД±z eyni rolla giriЕџ icazЙ™si siyahД±sД±na Й™lavЙ™ edilmiЕџ e-poГ§tlar ГјГ§Гјn iЕџlЙ™yir.',
  'login.emailPlaceholder': 'E-poГ§t',
  'login.passwordHelp': 'Minimum 10 simvol. TЙ™hlГјkЙ™sizlik ГјГ§Гјn hЙ™rf vЙ™ rЙ™qЙ™m qarД±ЕџД±ДџД±ndan istifadЙ™ edin.',
  'login.processing': 'EMAL EDД°LД°R...',
  'login.updatePassword': 'ЕћД°FRЖЏNД° YENД°LЖЏ',
  'login.sendResetEmail': 'SIFIRLAMA MЖЏKTUBU GГ–NDЖЏR',
  'login.register': 'QEYDД°YYAT',
  'login.signInButton': 'DAXД°L OL',
  'login.forgotPassword': 'ЕћifrЙ™ni unutmusunuz?',
  'login.backToSignIn': 'GiriЕџЙ™ qayД±t',
  'login.needAccount': 'HesabД±nД±z yoxdur?',
  'login.haveAccount': 'HesabД±nД±z var?',
  'login.registerNow': 'Д°ndi qeydiyyatdan keГ§in',
  'login.signInNow': 'Д°ndi daxil olun',
});


Object.assign(translations.ru, {
  'language.az': 'AZ',
  'language.en': 'EN',
  'language.ru': 'RU',
  'common.logout': 'Р’С‹Р№С‚Рё',
  'common.loadingPage': 'Р—Р°РіСЂСѓР·РєР° СЃС‚СЂР°РЅРёС†С‹...',
  'common.loadingSession': 'Р—Р°РіСЂСѓР·РєР° СЃРµСЃСЃРёРё...',
  'common.loading': 'Р—Р°РіСЂСѓР·РєР°...',
  'common.saving': 'РЎРѕС…СЂР°РЅРµРЅРёРµ...',
  'common.deleting': 'РЈРґР°Р»РµРЅРёРµ...',
  'common.cancel': 'РћС‚РјРµРЅР°',
  'common.edit': 'Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ',
  'common.delete': 'РЈРґР°Р»РёС‚СЊ',
  'common.submit': 'РћС‚РїСЂР°РІРёС‚СЊ',
  'common.saveDraft': 'РЎРѕС…СЂР°РЅРёС‚СЊ С‡РµСЂРЅРѕРІРёРє',
  'common.gameCode': 'РљРѕРґ РёРіСЂС‹',
  'common.game': 'РРіСЂР°',
  'common.date': 'Р”Р°С‚Р°',
  'common.time': 'Р’СЂРµРјСЏ',
  'common.venue': 'РђСЂРµРЅР°',
  'common.role': 'Р РѕР»СЊ',
  'common.fullName': 'РџРѕР»РЅРѕРµ РёРјСЏ',
  'common.email': 'E-mail',
  'common.emailAddress': 'РђРґСЂРµСЃ e-mail',
  'common.password': 'РџР°СЂРѕР»СЊ',
  'common.confirmPassword': 'РџРѕРґС‚РІРµСЂРґРёС‚Рµ РїР°СЂРѕР»СЊ',
  'common.license': 'Р›РёС†РµРЅР·РёСЏ',
  'common.status': 'РЎС‚Р°С‚СѓСЃ',
  'common.crew': 'Р‘СЂРёРіР°РґР°',
  'common.toCrew': 'Р‘СЂРёРіР°РґР° TO',
  'common.matchDetails': 'Р”РµС‚Р°Р»Рё РјР°С‚С‡Р°',
  'common.finalScore': 'РС‚РѕРіРѕРІС‹Р№ СЃС‡РµС‚: {score}',
  'common.youtube': 'YouTube',
  'common.gameScoresheet': 'РџСЂРѕС‚РѕРєРѕР» РјР°С‚С‡Р°',
  'common.notAssigned': 'РќРµ РЅР°Р·РЅР°С‡РµРЅРѕ',
  'common.awaitingConfirmation': 'РћР¶РёРґР°РµС‚ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ',
  'common.selectReferee': 'Р’С‹Р±РµСЂРёС‚Рµ СЃСѓРґСЊСЋ',
  'common.selectOfficial': 'Р’С‹Р±РµСЂРёС‚Рµ РѕС„РёС†РёР°Р»СЊРЅРѕРµ Р»РёС†Рѕ',
  'common.selectTO': 'Р’С‹Р±РµСЂРёС‚Рµ TO',
  'common.sendTo': 'РћС‚РїСЂР°РІРёС‚СЊ: {name}',
  'common.noRefereeSelected': 'РЎСѓРґСЊСЏ РЅРµ РІС‹Р±СЂР°РЅ',
  'common.recentActivity': 'РќРµРґР°РІРЅСЏСЏ Р°РєС‚РёРІРЅРѕСЃС‚СЊ',
  'role.Instructor': 'РРЅСЃС‚СЂСѓРєС‚РѕСЂ',
  'role.Referee': 'РЎСѓРґСЊСЏ',
  'role.TO': 'TO',
  'role.TO Supervisor': 'РЎСѓРїРµСЂРІР°Р№Р·РµСЂ TO',
  'role.Staff': 'РџРµСЂСЃРѕРЅР°Р»',
  'status.Accepted': 'РџСЂРёРЅСЏС‚Рѕ',
  'status.Declined': 'РћС‚РєР»РѕРЅРµРЅРѕ',
  'status.Assigned': 'РќР°Р·РЅР°С‡РµРЅРѕ',
  'status.Pending': 'РћР¶РёРґР°РЅРёРµ',
  'status.Draft': 'Р§РµСЂРЅРѕРІРёРє',
  'status.Submitted': 'РћС‚РїСЂР°РІР»РµРЅРѕ',
  'status.Reviewed': 'РџСЂРѕРІРµСЂРµРЅРѕ',
  'status.noReport': 'РќРµС‚ РѕС‚С‡РµС‚Р°',
  'slot.referee1': 'РЎС‚Р°СЂС€РёР№ СЃСѓРґСЊСЏ',
  'slot.referee2': 'РЎСѓРґСЊСЏ 1',
  'slot.referee3': 'РЎСѓРґСЊСЏ 2',
  'slot.refereeN': 'РЎСѓРґСЊСЏ {slotNumber}',
  'slot.to1': 'РџСЂРѕС‚РѕРєРѕР»РёСЃС‚',
  'slot.to2': 'РџРѕРјРѕС‰РЅРёРє РїСЂРѕС‚РѕРєРѕР»РёСЃС‚Р°',
  'slot.to3': 'РҐСЂРѕРЅРѕРјРµС‚СЂРёСЃС‚',
  'slot.to4': 'РћРїРµСЂР°С‚РѕСЂ 24 СЃРµРєСѓРЅРґ',
  'slot.toN': 'TO {slotNumber}',
  'login.passwordsMismatch': 'РџР°СЂРѕР»Рё РЅРµ СЃРѕРІРїР°РґР°СЋС‚.',
  'login.passwordUpdated': 'РџР°СЂРѕР»СЊ РѕР±РЅРѕРІР»РµРЅ. Р’РѕР№РґРёС‚Рµ СЃ РЅРѕРІС‹Рј РїР°СЂРѕР»РµРј.',
  'login.passwordResetSent': 'РџРёСЃСЊРјРѕ РґР»СЏ СЃР±СЂРѕСЃР° РїР°СЂРѕР»СЏ РѕС‚РїСЂР°РІР»РµРЅРѕ. РџСЂРѕРІРµСЂСЊС‚Рµ РїРѕС‡С‚Сѓ.',
  'login.authenticationFailed': 'РћС€РёР±РєР° Р°СѓС‚РµРЅС‚РёС„РёРєР°С†РёРё.',
  'login.passwordRecovery': 'Р’РѕСЃСЃС‚Р°РЅРѕРІР»РµРЅРёРµ РїР°СЂРѕР»СЏ',
  'login.setNewPassword': 'РЈСЃС‚Р°РЅРѕРІРёС‚СЊ РЅРѕРІС‹Р№ РїР°СЂРѕР»СЊ',
  'login.resetYourPassword': 'РЎР±СЂРѕСЃ РїР°СЂРѕР»СЏ',
  'login.resetPassword': 'РЎР±СЂРѕСЃРёС‚СЊ РїР°СЂРѕР»СЊ',
  'login.createOfficialAccount': 'РЎРѕР·РґР°С‚СЊ Р°РєРєР°СѓРЅС‚',
  'login.signIn': 'Р’РѕР№С‚Рё',
  'login.recoveryHelp': 'Р’РІРµРґРёС‚Рµ РЅРѕРІС‹Р№ РїР°СЂРѕР»СЊ, С‡С‚РѕР±С‹ Р·Р°РІРµСЂС€РёС‚СЊ РІРѕСЃСЃС‚Р°РЅРѕРІР»РµРЅРёРµ.',
  'login.resetPageHelp': 'РћС‚РєСЂРѕР№С‚Рµ СЌС‚Сѓ СЃС‚СЂР°РЅРёС†Сѓ РїРѕ СЃСЃС‹Р»РєРµ РёР· РїРёСЃСЊРјР° РґР»СЏ СЃР±СЂРѕСЃР°. РџРѕСЃР»Рµ РїСЂРѕРІРµСЂРєРё СЃСЃС‹Р»РєРё РІ Supabase РІС‹ СЃРјРѕР¶РµС‚Рµ Р·Р°РґР°С‚СЊ РЅРѕРІС‹Р№ РїР°СЂРѕР»СЊ Р·РґРµСЃСЊ.',
  'login.resetHelp': 'Р’РІРµРґРёС‚Рµ РІР°С€ e-mail, Рё РјС‹ РѕС‚РїСЂР°РІРёРј СЃСЃС‹Р»РєСѓ РґР»СЏ СЃР±СЂРѕСЃР° РїР°СЂРѕР»СЏ.',
  'login.registerHelp': 'Р РµРіРёСЃС‚СЂР°С†РёСЏ РґРѕСЃС‚СѓРїРЅР° С‚РѕР»СЊРєРѕ РґР»СЏ e-mail Рё СЂРѕР»РµР№, РѕРґРѕР±СЂРµРЅРЅС‹С… РёРЅСЃС‚СЂСѓРєС‚РѕСЂРѕРј.',
  'login.signInHelp': 'РСЃРїРѕР»СЊР·СѓР№С‚Рµ РѕРґРѕР±СЂРµРЅРЅС‹Р№ Р°РєРєР°СѓРЅС‚ ABL РґР»СЏ РґРѕСЃС‚СѓРїР° Рє РЅР°Р·РЅР°С‡РµРЅРёСЏРј, РѕС‚С‡РµС‚Р°Рј Рё СЂРµР№С‚РёРЅРіСѓ.',
  'login.securePlatform': 'РџР»Р°С‚С„РѕСЂРјР° ABL РґР»СЏ РЅР°Р·РЅР°С‡РµРЅРёР№, РѕС‚С‡РµС‚РѕРІ, СЂРµР№С‚РёРЅРіРѕРІ Рё СѓРїСЂР°РІР»РµРЅРёСЏ СѓС‡Р°СЃС‚РЅРёРєР°РјРё.',
  'login.fullNamePlaceholder': 'РџРѕР»РЅРѕРµ РёРјСЏ',
  'login.registrationRoleHelp': 'Р РµРіРёСЃС‚СЂР°С†РёСЏ СЂР°Р±РѕС‚Р°РµС‚ С‚РѕР»СЊРєРѕ РґР»СЏ e-mail, РґРѕР±Р°РІР»РµРЅРЅС‹С… РІ СЃРїРёСЃРѕРє РґРѕСЃС‚СѓРїР° СЃ С‚РѕР№ Р¶Рµ СЂРѕР»СЊСЋ.',
  'login.emailPlaceholder': 'E-mail',
  'login.passwordHelp': 'РњРёРЅРёРјСѓРј 10 СЃРёРјРІРѕР»РѕРІ. РСЃРїРѕР»СЊР·СѓР№С‚Рµ Р±СѓРєРІС‹ Рё С†РёС„СЂС‹ РґР»СЏ Р±РѕР»СЊС€РµР№ Р±РµР·РѕРїР°СЃРЅРѕСЃС‚Рё.',
  'login.processing': 'РћР‘Р РђР‘РћРўРљРђ...',
  'login.updatePassword': 'РћР‘РќРћР’РРўР¬ РџРђР РћР›Р¬',
  'login.sendResetEmail': 'РћРўРџР РђР’РРўР¬ РџРРЎР¬РњРћ',
  'login.register': 'Р—РђР Р•Р“РРЎРўР РР РћР’РђРўР¬РЎРЇ',
  'login.signInButton': 'Р’РћР™РўР',
  'login.forgotPassword': 'Р—Р°Р±С‹Р»Рё РїР°СЂРѕР»СЊ?',
  'login.backToSignIn': 'РќР°Р·Р°Рґ РєРѕ РІС…РѕРґСѓ',
  'login.needAccount': 'РќРµС‚ Р°РєРєР°СѓРЅС‚Р°?',
  'login.haveAccount': 'РЈР¶Рµ РµСЃС‚СЊ Р°РєРєР°СѓРЅС‚?',
  'login.registerNow': 'Р—Р°СЂРµРіРёСЃС‚СЂРёСЂРѕРІР°С‚СЊСЃСЏ',
  'login.signInNow': 'Р’РѕР№С‚Рё',
});

Object.assign(translations.en, {
  'countdown.applied': 'Auto reject is being applied.',
  'countdown.inDays': 'Auto reject in {days}d {hours}h {minutes}m',
  'countdown.inHours': 'Auto reject in {hours}h {minutes}m',
  'countdown.inMinutes': 'Auto reject in {minutes}m {seconds}s',
  'countdown.inSeconds': 'Auto reject in {seconds}s',
});

Object.assign(translations.az, {
  'countdown.applied': 'Avto imtina tЙ™tbiq olunur.',
  'countdown.inDays': 'Avto imtinaya {days}g {hours}s {minutes}d',
  'countdown.inHours': 'Avto imtinaya {hours}s {minutes}d',
  'countdown.inMinutes': 'Avto imtinaya {minutes}d {seconds}san',
  'countdown.inSeconds': 'Avto imtinaya {seconds}san',
});

Object.assign(translations.ru, {
  'countdown.applied': 'РђРІС‚РѕРѕС‚РєР°Р· РїСЂРёРјРµРЅСЏРµС‚СЃСЏ.',
  'countdown.inDays': 'РђРІС‚РѕРѕС‚РєР°Р· С‡РµСЂРµР· {days}Рґ {hours}С‡ {minutes}Рј',
  'countdown.inHours': 'РђРІС‚РѕРѕС‚РєР°Р· С‡РµСЂРµР· {hours}С‡ {minutes}Рј',
  'countdown.inMinutes': 'РђРІС‚РѕРѕС‚РєР°Р· С‡РµСЂРµР· {minutes}Рј {seconds}СЃ',
  'countdown.inSeconds': 'РђРІС‚РѕРѕС‚РєР°Р· С‡РµСЂРµР· {seconds}СЃ',
});

Object.assign(translations.en, {
  'nominations.title': 'Nominations',
  'nominations.myTitle': 'My Nominations',
  'reports.title': 'Reports',
  'reports.myTitle': 'My Reports',
  'news.title': 'News',
  'members.title': 'All Members',
  'activity.title': 'Activity',
  'teyinat.title': 'Teyinat',
  'dashboard.navRanking': 'Ranking',
  'dashboard.navMyRanking': 'My Ranking',
  'dashboard.navTORanking': 'TO Ranking',
  'dashboard.gameDay': 'Gameday!',
  'dashboard.gameDayWish': 'Good luck today. Stay sharp and have a great game.',
  'dashboard.accept': 'Accept',
  'dashboard.decline': 'Decline',
});

Object.assign(translations.az, {
  'nominations.title': 'TЙ™yinatlar',
  'nominations.myTitle': 'MЙ™nim tЙ™yinatlarД±m',
  'reports.title': 'Reportlar',
  'reports.myTitle': 'MЙ™nim reportlarД±m',
  'news.title': 'XЙ™bЙ™rlЙ™r',
  'members.title': 'BГјtГјn ГјzvlЙ™r',
  'activity.title': 'Aktivlik',
  'teyinat.title': 'TЙ™yinat',
  'dashboard.navRanking': 'Reytinq',
  'dashboard.navMyRanking': 'MЙ™nim reytinqim',
  'dashboard.navTORanking': 'TO reytinqi',
  'dashboard.gameDay': 'Oyun gГјnГј!',
  'dashboard.gameDayWish': 'Bu gГјn uДџurlar. DiqqЙ™tli olun vЙ™ oyununuz yaxЕџД± keГ§sin.',
  'dashboard.accept': 'QЙ™bul et',
  'dashboard.decline': 'Д°mtina et',
});

Object.assign(translations.ru, {
  'nominations.title': 'РќР°Р·РЅР°С‡РµРЅРёСЏ',
  'nominations.myTitle': 'РњРѕРё РЅР°Р·РЅР°С‡РµРЅРёСЏ',
  'reports.title': 'РћС‚С‡РµС‚С‹',
  'reports.myTitle': 'РњРѕРё РѕС‚С‡РµС‚С‹',
  'news.title': 'РќРѕРІРѕСЃС‚Рё',
  'members.title': 'Р’СЃРµ СѓС‡Р°СЃС‚РЅРёРєРё',
  'activity.title': 'РђРєС‚РёРІРЅРѕСЃС‚СЊ',
  'teyinat.title': 'Teyinat',
  'dashboard.navRanking': 'Р РµР№С‚РёРЅРі',
  'dashboard.navMyRanking': 'РњРѕР№ СЂРµР№С‚РёРЅРі',
  'dashboard.navTORanking': 'Р РµР№С‚РёРЅРі TO',
  'dashboard.gameDay': 'Р”РµРЅСЊ РёРіСЂС‹!',
  'dashboard.gameDayWish': 'РЈРґР°С‡Рё СЃРµРіРѕРґРЅСЏ. Р‘СѓРґСЊС‚Рµ СЃРѕР±СЂР°РЅС‹ Рё РїСЂРѕРІРµРґРёС‚Рµ РѕС‚Р»РёС‡РЅС‹Р№ РјР°С‚С‡.',
  'dashboard.accept': 'РџСЂРёРЅСЏС‚СЊ',
  'dashboard.decline': 'РћС‚РєР°Р·Р°С‚СЊСЃСЏ',
});

Object.assign(translations.en, {
  'dashboard.createdNominations': 'Created Nominations',
  'dashboard.upcomingGames': 'Upcoming Games',
  'dashboard.pastGames': 'Past Games',
  'dashboard.noUpcomingNominations': 'No upcoming nominations.',
  'dashboard.noUpcomingGames': 'No upcoming games.',
  'dashboard.noUpcomingGamesYet': 'No upcoming games yet.',
  'dashboard.noPastGamesYet': 'No past games yet.',
  'dashboard.createdByLabel': 'Created by: {name}',
  'dashboard.deleteGame': 'Delete Game',
  'dashboard.selectReplacementOfficial': 'Select replacement official',
  'dashboard.replaceSlot': 'Replace {slot}',
  'dashboard.replacing': 'Replacing...',
  'dashboard.noFreeReferee': 'No free referee is available for this slot.',
  'dashboard.gamesAwaitingTOCrew': 'Games Awaiting TO Crew',
  'dashboard.selectTO': 'Select TO',
  'dashboard.saveTOCrew': 'Save TO Crew',
  'dashboard.savingTOCrew': 'Saving TO Crew...',
  'dashboard.saveCrew': 'Save Crew',
  'dashboard.toCrewLocked': 'TO crew can no longer be assigned after the match starts.',
  'dashboard.toCrewWillAppear': 'TO crew will appear after the TO Supervisor assigns officials and they accept the game.',
  'dashboard.replacementNotices': 'Replacement Notices',
  'dashboard.noDeclinedYet': 'No referee has declined a game yet.',
  'dashboard.declinedGame': '{name} Declined Game',
  'dashboard.newOfficial': 'New official: {name}',
  'dashboard.myGameAssignments': 'My Game Assignments',
  'dashboard.gameAssignments': 'Game Assignments',
  'dashboard.upcomingAssignedGames': 'Upcoming Assigned Games',
});

Object.assign(translations.az, {
  'dashboard.createdNominations': 'YaradД±lmД±Еџ tЙ™yinatlar',
  'dashboard.upcomingGames': 'QarЕџД±dakД± oyunlar',
  'dashboard.pastGames': 'KeГ§miЕџ oyunlar',
  'dashboard.noUpcomingNominations': 'QarЕџД±dakД± tЙ™yinat yoxdur.',
  'dashboard.noUpcomingGames': 'QarЕџД±dakД± oyun yoxdur.',
  'dashboard.noUpcomingGamesYet': 'HЙ™lЙ™ qarЕџД±dakД± oyun yoxdur.',
  'dashboard.noPastGamesYet': 'HЙ™lЙ™ keГ§miЕџ oyun yoxdur.',
  'dashboard.createdByLabel': 'Yaradan: {name}',
  'dashboard.deleteGame': 'Oyunu sil',
  'dashboard.selectReplacementOfficial': 'ЖЏvЙ™zlЙ™yici rЙ™smi ЕџЙ™xs seГ§in',
  'dashboard.replaceSlot': '{slot} Й™vЙ™z et',
  'dashboard.replacing': 'ЖЏvЙ™zlЙ™nir...',
  'dashboard.noFreeReferee': 'Bu slot ГјГ§Гјn boЕџ hakim yoxdur.',
  'dashboard.gamesAwaitingTOCrew': 'TO heyЙ™ti gГ¶zlЙ™yЙ™n oyunlar',
  'dashboard.selectTO': 'TO seГ§in',
  'dashboard.saveTOCrew': 'TO heyЙ™tini saxla',
  'dashboard.savingTOCrew': 'TO heyЙ™ti saxlanД±lД±r...',
  'dashboard.saveCrew': 'BrigadanД± saxla',
  'dashboard.toCrewLocked': 'Oyun baЕџladД±qdan sonra TO heyЙ™ti artД±q tЙ™yin edilЙ™ bilmЙ™z.',
  'dashboard.toCrewWillAppear': 'TO heyЙ™ti TO Supervisor rЙ™smi ЕџЙ™xslЙ™ri tЙ™yin edib oyunu qЙ™bul etdikdЙ™n sonra gГ¶rГјnЙ™cЙ™k.',
  'dashboard.replacementNotices': 'ЖЏvЙ™zlЙ™nmЙ™ bildiriЕџlЙ™ri',
  'dashboard.noDeclinedYet': 'HeГ§ bir hakim hЙ™lЙ™ oyundan imtina etmЙ™yib.',
  'dashboard.declinedGame': '{name} oyundan imtina etdi',
  'dashboard.newOfficial': 'Yeni rЙ™smi ЕџЙ™xs: {name}',
  'dashboard.myGameAssignments': 'MЙ™nim oyun tЙ™yinatlarД±m',
  'dashboard.gameAssignments': 'Oyun tЙ™yinatlarД±',
  'dashboard.upcomingAssignedGames': 'QarЕџД±dakД± tЙ™yin olunmuЕџ oyunlar',
});

Object.assign(translations.ru, {
  'dashboard.createdNominations': 'РЎРѕР·РґР°РЅРЅС‹Рµ РЅР°Р·РЅР°С‡РµРЅРёСЏ',
  'dashboard.upcomingGames': 'РџСЂРµРґСЃС‚РѕСЏС‰РёРµ РёРіСЂС‹',
  'dashboard.pastGames': 'РџСЂРѕС€РµРґС€РёРµ РёРіСЂС‹',
  'dashboard.noUpcomingNominations': 'РќРµС‚ РїСЂРµРґСЃС‚РѕСЏС‰РёС… РЅР°Р·РЅР°С‡РµРЅРёР№.',
  'dashboard.noUpcomingGames': 'РќРµС‚ РїСЂРµРґСЃС‚РѕСЏС‰РёС… РёРіСЂ.',
  'dashboard.noUpcomingGamesYet': 'РџСЂРµРґСЃС‚РѕСЏС‰РёС… РёРіСЂ РїРѕРєР° РЅРµС‚.',
  'dashboard.noPastGamesYet': 'РџСЂРѕС€РµРґС€РёС… РёРіСЂ РїРѕРєР° РЅРµС‚.',
  'dashboard.createdByLabel': 'РЎРѕР·РґР°Р»: {name}',
  'dashboard.deleteGame': 'РЈРґР°Р»РёС‚СЊ РёРіСЂСѓ',
  'dashboard.selectReplacementOfficial': 'Р’С‹Р±РµСЂРёС‚Рµ Р·Р°РјРµРЅСѓ',
  'dashboard.replaceSlot': 'Р—Р°РјРµРЅРёС‚СЊ {slot}',
  'dashboard.replacing': 'Р—Р°РјРµРЅР°...',
  'dashboard.noFreeReferee': 'РќРµС‚ СЃРІРѕР±РѕРґРЅРѕРіРѕ СЃСѓРґСЊРё РґР»СЏ СЌС‚РѕР№ РїРѕР·РёС†РёРё.',
  'dashboard.gamesAwaitingTOCrew': 'РРіСЂС‹, РѕР¶РёРґР°СЋС‰РёРµ Р±СЂРёРіР°РґСѓ TO',
  'dashboard.selectTO': 'Р’С‹Р±РµСЂРёС‚Рµ TO',
  'dashboard.saveTOCrew': 'РЎРѕС…СЂР°РЅРёС‚СЊ Р±СЂРёРіР°РґСѓ TO',
  'dashboard.savingTOCrew': 'РЎРѕС…СЂР°РЅРµРЅРёРµ Р±СЂРёРіР°РґС‹ TO...',
  'dashboard.saveCrew': 'РЎРѕС…СЂР°РЅРёС‚СЊ Р±СЂРёРіР°РґСѓ',
  'dashboard.toCrewLocked': 'РџРѕСЃР»Рµ РЅР°С‡Р°Р»Р° РјР°С‚С‡Р° Р±СЂРёРіР°РґСѓ TO РЅР°Р·РЅР°С‡Р°С‚СЊ РЅРµР»СЊР·СЏ.',
  'dashboard.toCrewWillAppear': 'Р‘СЂРёРіР°РґР° TO РїРѕСЏРІРёС‚СЃСЏ РїРѕСЃР»Рµ С‚РѕРіРѕ, РєР°Рє TO Supervisor РЅР°Р·РЅР°С‡РёС‚ СЃРѕС‚СЂСѓРґРЅРёРєРѕРІ Рё РѕРЅРё РїСЂРёРјСѓС‚ РёРіСЂСѓ.',
  'dashboard.replacementNotices': 'РЈРІРµРґРѕРјР»РµРЅРёСЏ Рѕ Р·Р°РјРµРЅРµ',
  'dashboard.noDeclinedYet': 'РџРѕРєР° РЅРё РѕРґРёРЅ СЃСѓРґСЊСЏ РЅРµ РѕС‚РєР°Р·Р°Р»СЃСЏ РѕС‚ РёРіСЂС‹.',
  'dashboard.declinedGame': '{name} РѕС‚РєР°Р·Р°Р»СЃСЏ РѕС‚ РёРіСЂС‹',
  'dashboard.newOfficial': 'РќРѕРІС‹Р№ СЃСѓРґСЊСЏ: {name}',
  'dashboard.myGameAssignments': 'РњРѕРё РЅР°Р·РЅР°С‡РµРЅРёСЏ',
  'dashboard.gameAssignments': 'РќР°Р·РЅР°С‡РµРЅРёСЏ РЅР° РёРіСЂС‹',
  'dashboard.upcomingAssignedGames': 'РџСЂРµРґСЃС‚РѕСЏС‰РёРµ РЅР°Р·РЅР°С‡РµРЅРЅС‹Рµ РёРіСЂС‹',
});

Object.assign(translations.en, {
  'dashboard.instructorPanel': 'Instructor Panel',
  'dashboard.toSupervisorPanel': 'TO Supervisor Panel',
  'dashboard.staffPanel': 'Staff Panel',
  'dashboard.toDashboard': 'TO Dashboard',
  'dashboard.refZoneDashboard': 'RefZone Dashboard',
  'dashboard.instructorControls': 'Instructor Controls',
  'dashboard.instructorControlsHelp': 'Create nominations, edit members and manage registration access.',
  'dashboard.allMembers': 'All Members',
  'dashboard.addAccess': 'Add Access',
  'dashboard.createNomination': 'Create Nomination',
  'dashboard.instructorNotifications': 'Instructor Notifications',
  'dashboard.creatingNomination': 'Creating...',
  'dashboard.saveNomination': 'Save Nomination',
});

Object.assign(translations.az, {
  'dashboard.instructorPanel': 'Д°nstruktor paneli',
  'dashboard.toSupervisorPanel': 'TO Supervisor paneli',
  'dashboard.staffPanel': 'Staff paneli',
  'dashboard.toDashboard': 'TO paneli',
  'dashboard.refZoneDashboard': 'RefZone paneli',
  'dashboard.instructorControls': 'Д°nstruktor idarЙ™etmЙ™si',
  'dashboard.instructorControlsHelp': 'TЙ™yinat yarat, ГјzvlЙ™ri dГјzЙ™lt vЙ™ qeydiyyat giriЕџini idarЙ™ et.',
  'dashboard.allMembers': 'BГјtГјn ГјzvlЙ™r',
  'dashboard.addAccess': 'GiriЕџ Й™lavЙ™ et',
  'dashboard.createNomination': 'TЙ™yinat yarat',
  'dashboard.instructorNotifications': 'Д°nstruktor bildiriЕџlЙ™ri',
});

Object.assign(translations.ru, {
  'dashboard.creatingNomination': 'Создание...',
  'dashboard.saveNomination': 'Сохранить назначение',
  'dashboard.instructorPanel': 'РџР°РЅРµР»СЊ РёРЅСЃС‚СЂСѓРєС‚РѕСЂР°',
  'dashboard.toSupervisorPanel': 'РџР°РЅРµР»СЊ TO Supervisor',
  'dashboard.staffPanel': 'РџР°РЅРµР»СЊ Staff',
  'dashboard.toDashboard': 'РџР°РЅРµР»СЊ TO',
  'dashboard.refZoneDashboard': 'РџР°РЅРµР»СЊ RefZone',
  'dashboard.instructorControls': 'РЈРїСЂР°РІР»РµРЅРёРµ РёРЅСЃС‚СЂСѓРєС‚РѕСЂР°',
  'dashboard.instructorControlsHelp': 'РЎРѕР·РґР°РІР°Р№С‚Рµ РЅР°Р·РЅР°С‡РµРЅРёСЏ, СЂРµРґР°РєС‚РёСЂСѓР№С‚Рµ СѓС‡Р°СЃС‚РЅРёРєРѕРІ Рё СѓРїСЂР°РІР»СЏР№С‚Рµ РґРѕСЃС‚СѓРїРѕРј Рє СЂРµРіРёСЃС‚СЂР°С†РёРё.',
  'dashboard.allMembers': 'Р’СЃРµ СѓС‡Р°СЃС‚РЅРёРєРё',
  'dashboard.addAccess': 'Р”РѕР±Р°РІРёС‚СЊ РґРѕСЃС‚СѓРї',
  'dashboard.createNomination': 'РЎРѕР·РґР°С‚СЊ РЅР°Р·РЅР°С‡РµРЅРёРµ',
  'dashboard.instructorNotifications': 'РЈРІРµРґРѕРјР»РµРЅРёСЏ РёРЅСЃС‚СЂСѓРєС‚РѕСЂР°',
});

const I18nContext = createContext<I18nValue | null>(null);

const interpolate = (template: string, params?: TranslationParams) => {
  if (!params) {
    return template;
  }

  return Object.entries(params).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value == null ? '' : String(value)),
    template,
  );
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === 'undefined') {
      return 'en';
    }

    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return stored === 'az' || stored === 'ru' || stored === 'en' ? stored : 'en';
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  const value = useMemo<I18nValue>(
    () => ({
      language,
      locale: localeByLanguage[language],
      setLanguage,
      t: (key, params) => interpolate(translations[language][key] || translations.en[key] || key, params),
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error('useI18n must be used inside I18nProvider.');
  }

  return value;
};

export const getRoleLabel = (role: UserRole, language: Language) => translations[language][`role.${role}`] || role;

export const getAssignmentStatusLabel = (status: AssignmentStatus | string, language: Language) =>
  translations[language][`status.${status}`] || status;

export const getReportStatusLabel = (status: ReportStatus | 'No Report' | null | undefined, language: Language) => {
  if (!status || status === 'No Report') {
    return translations[language]['status.noReport'] || 'No Report';
  }

  return translations[language][`status.${status}`] || status;
};

export const getNominationSlotLabelByLanguage = (slotNumber: number, language: Language) => {
  if (slotNumber === 1) return translations[language]['slot.referee1'] || 'Referee';
  if (slotNumber === 2) return translations[language]['slot.referee2'] || 'Umpire 1';
  if (slotNumber === 3) return translations[language]['slot.referee3'] || 'Umpire 2';
  return interpolate(translations[language]['slot.refereeN'] || 'Referee {slotNumber}', { slotNumber });
};

export const getTOSlotLabelByLanguage = (slotNumber: number, language: Language) => {
  if (slotNumber === 1) return translations[language]['slot.to1'] || 'Scorer';
  if (slotNumber === 2) return translations[language]['slot.to2'] || 'Assistant Scorer';
  if (slotNumber === 3) return translations[language]['slot.to3'] || 'Timer';
  if (slotNumber === 4) return translations[language]['slot.to4'] || '24sec Operator';
  return interpolate(translations[language]['slot.toN'] || 'TO {slotNumber}', { slotNumber });
};

export const formatLocalizedDateTime = (value: string, locale: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Baku',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};
