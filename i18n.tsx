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
  'common.logout': 'Çıxış',
  'common.loadingPage': 'Səhifə yüklənir...',
  'common.loadingSession': 'Sessiya yüklənir...',
  'common.loading': 'Yüklənir...',
  'common.saving': 'Yadda saxlanılır...',
  'common.deleting': 'Silinir...',
  'common.cancel': 'Ləğv et',
  'common.edit': 'Düzəliş et',
  'common.delete': 'Sil',
  'common.submit': 'Təsdiqlə',
  'common.saveDraft': 'Qaralama saxla',
  'common.gameCode': 'Oyun kodu',
  'common.game': 'Oyun',
  'common.date': 'Tarix',
  'common.time': 'Saat',
  'common.venue': 'Məkan',
  'common.role': 'Rol',
  'common.fullName': 'Ad soyad',
  'common.email': 'E-poçt',
  'common.emailAddress': 'E-poçt ünvanı',
  'common.password': 'Şifrə',
  'common.confirmPassword': 'Şifrəni təsdiqlə',
  'common.license': 'Lisenziya',
  'common.status': 'Status',
  'common.crew': 'Brigada',
  'common.toCrew': 'TO heyəti',
  'common.matchDetails': 'Oyun detalları',
  'common.finalScore': 'Yekun hesab: {score}',
  'common.youtube': 'YouTube',
  'common.gameScoresheet': 'Oyun protokolu',
  'common.notAssigned': 'Təyin edilməyib',
  'common.awaitingConfirmation': 'Təsdiq gözlənilir',
  'common.selectReferee': 'Hakim seçin',
  'common.selectOfficial': 'Rəsmi şəxs seçin',
  'common.selectTO': 'TO seçin',
  'common.sendTo': 'Göndərilir: {name}',
  'common.noRefereeSelected': 'Hakim seçilməyib',
  'common.recentActivity': 'Son aktivlik',
  'role.Instructor': 'İnstruktor',
  'role.Referee': 'Hakim',
  'role.TO': 'TO',
  'role.TO Supervisor': 'TO Supervisor',
  'role.Staff': 'Personal',
  'status.Accepted': 'Qəbul edildi',
  'status.Declined': 'İmtina edildi',
  'status.Assigned': 'Təyin edildi',
  'status.Pending': 'Gözləyir',
  'status.Draft': 'Qaralama',
  'status.Submitted': 'Göndərildi',
  'status.Reviewed': 'Yoxlanıldı',
  'status.noReport': 'Report yoxdur',
  'slot.referee1': 'Baş Hakim',
  'slot.referee2': 'Köməkçi Hakim 1',
  'slot.referee3': 'Köməkçi Hakim 2',
  'slot.refereeN': 'Hakim {slotNumber}',
  'slot.to1': 'Katib',
  'slot.to2': 'Katib köməkçisi',
  'slot.to3': 'Tablo',
  'slot.to4': '24/14 operator',
  'slot.toN': 'TO {slotNumber}',
  'login.passwordsMismatch': 'Şifrələr uyğun gəlmir.',
  'login.passwordUpdated': 'Şifrə yeniləndi. Yeni şifrənizlə daxil olun.',
  'login.passwordResetSent': 'Şifrə sıfırlama məktubu göndərildi. Gələn qutunu yoxlayın.',
  'login.authenticationFailed': 'Autentifikasiya uğursuz oldu.',
  'login.passwordRecovery': 'Şifrə bərpası',
  'login.setNewPassword': 'Yeni şifrə təyin et',
  'login.resetYourPassword': 'Şifrənizi sıfırlayın',
  'login.resetPassword': 'Şifrəni sıfırla',
  'login.createOfficialAccount': 'Rəsmi hesab yarat',
  'login.signIn': 'Daxil ol',
  'login.recoveryHelp': 'Bərpa prosesini bitirmək üçün yeni şifrənizi daxil edin.',
  'login.resetPageHelp': 'Bu səhifəni sıfırlama məktubundakı linkdən açın. Supabase linki təsdiqlədikdən sonra burada yeni şifrə qura bilərsiniz.',
  'login.resetHelp': 'E-poçt ünvanınızı daxil edin, sizə şifrə sıfırlama linki göndərək.',
  'login.registerHelp': 'Qeydiyyat yalnız instruktor tərəfindən təsdiqlənmiş e-poçt və rollar üçün mümkündür.',
  'login.signInHelp': 'Təyinatlara, reportlara və reytinqə daxil olmaq üçün təsdiqlənmiş ABL hesabınızdan istifadə edin.',
  'login.securePlatform': 'ABL hakimləri üçün təyinat, report, reytinq və üzv idarəetmə platforması.',
  'login.fullNamePlaceholder': 'Ad soyad',
  'login.registrationRoleHelp': 'Qeydiyyat yalnız eyni rolla giriş icazəsi siyahısına əlavə edilmiş e-poçtlar üçün işləyir.',
  'login.emailPlaceholder': 'E-poçt',
  'login.passwordHelp': 'Minimum 10 simvol. Təhlükəsizlik üçün hərf və rəqəm qarışığından istifadə edin.',
  'login.processing': 'EMAL EDİLİR...',
  'login.updatePassword': 'ŞİFRƏNİ YENİLƏ',
  'login.sendResetEmail': 'SIFIRLAMA MƏKTUBU GÖNDƏR',
  'login.register': 'QEYDİYYAT',
  'login.signInButton': 'DAXİL OL',
  'login.forgotPassword': 'Şifrəni unutmusunuz?',
  'login.backToSignIn': 'Girişə qayıt',
  'login.needAccount': 'Hesabınız yoxdur?',
  'login.haveAccount': 'Hesabınız var?',
  'login.registerNow': 'İndi qeydiyyatdan keçin',
  'login.signInNow': 'İndi daxil olun',
});


Object.assign(translations.ru, {
  'language.az': 'AZ',
  'language.en': 'EN',
  'language.ru': 'RU',
  'common.logout': 'Выйти',
  'common.loadingPage': 'Загрузка страницы...',
  'common.loadingSession': 'Загрузка сессии...',
  'common.loading': 'Загрузка...',
  'common.saving': 'Сохранение...',
  'common.deleting': 'Удаление...',
  'common.cancel': 'Отмена',
  'common.edit': 'Редактировать',
  'common.delete': 'Удалить',
  'common.submit': 'Отправить',
  'common.saveDraft': 'Сохранить черновик',
  'common.gameCode': 'Код игры',
  'common.game': 'Игра',
  'common.date': 'Дата',
  'common.time': 'Время',
  'common.venue': 'Арена',
  'common.role': 'Роль',
  'common.fullName': 'Полное имя',
  'common.email': 'E-mail',
  'common.emailAddress': 'Адрес e-mail',
  'common.password': 'Пароль',
  'common.confirmPassword': 'Подтвердите пароль',
  'common.license': 'Лицензия',
  'common.status': 'Статус',
  'common.crew': 'Бригада',
  'common.toCrew': 'Бригада TO',
  'common.matchDetails': 'Детали матча',
  'common.finalScore': 'Итоговый счет: {score}',
  'common.youtube': 'YouTube',
  'common.gameScoresheet': 'Протокол матча',
  'common.notAssigned': 'Не назначено',
  'common.awaitingConfirmation': 'Ожидает подтверждения',
  'common.selectReferee': 'Выберите судью',
  'common.selectOfficial': 'Выберите официальное лицо',
  'common.selectTO': 'Выберите TO',
  'common.sendTo': 'Отправить: {name}',
  'common.noRefereeSelected': 'Судья не выбран',
  'common.recentActivity': 'Недавняя активность',
  'role.Instructor': 'Инструктор',
  'role.Referee': 'Судья',
  'role.TO': 'TO',
  'role.TO Supervisor': 'Супервайзер TO',
  'role.Staff': 'Персонал',
  'status.Accepted': 'Принято',
  'status.Declined': 'Отклонено',
  'status.Assigned': 'Назначено',
  'status.Pending': 'Ожидание',
  'status.Draft': 'Черновик',
  'status.Submitted': 'Отправлено',
  'status.Reviewed': 'Проверено',
  'status.noReport': 'Нет отчета',
  'slot.referee1': 'Старший судья',
  'slot.referee2': 'Судья 1',
  'slot.referee3': 'Судья 2',
  'slot.refereeN': 'Судья {slotNumber}',
  'slot.to1': 'Протоколист',
  'slot.to2': 'Помощник протоколиста',
  'slot.to3': 'Хронометрист',
  'slot.to4': 'Оператор 24 секунд',
  'slot.toN': 'TO {slotNumber}',
  'login.passwordsMismatch': 'Пароли не совпадают.',
  'login.passwordUpdated': 'Пароль обновлен. Войдите с новым паролем.',
  'login.passwordResetSent': 'Письмо для сброса пароля отправлено. Проверьте почту.',
  'login.authenticationFailed': 'Ошибка аутентификации.',
  'login.passwordRecovery': 'Восстановление пароля',
  'login.setNewPassword': 'Установить новый пароль',
  'login.resetYourPassword': 'Сброс пароля',
  'login.resetPassword': 'Сбросить пароль',
  'login.createOfficialAccount': 'Создать аккаунт',
  'login.signIn': 'Войти',
  'login.recoveryHelp': 'Введите новый пароль, чтобы завершить восстановление.',
  'login.resetPageHelp': 'Откройте эту страницу по ссылке из письма для сброса. После проверки ссылки в Supabase вы сможете задать новый пароль здесь.',
  'login.resetHelp': 'Введите ваш e-mail, и мы отправим ссылку для сброса пароля.',
  'login.registerHelp': 'Регистрация доступна только для e-mail и ролей, одобренных инструктором.',
  'login.signInHelp': 'Используйте одобренный аккаунт ABL для доступа к назначениям, отчетам и рейтингу.',
  'login.securePlatform': 'Платформа ABL для назначений, отчетов, рейтингов и управления участниками.',
  'login.fullNamePlaceholder': 'Полное имя',
  'login.registrationRoleHelp': 'Регистрация работает только для e-mail, добавленных в список доступа с той же ролью.',
  'login.emailPlaceholder': 'E-mail',
  'login.passwordHelp': 'Минимум 10 символов. Используйте буквы и цифры для большей безопасности.',
  'login.processing': 'ОБРАБОТКА...',
  'login.updatePassword': 'ОБНОВИТЬ ПАРОЛЬ',
  'login.sendResetEmail': 'ОТПРАВИТЬ ПИСЬМО',
  'login.register': 'ЗАРЕГИСТРИРОВАТЬСЯ',
  'login.signInButton': 'ВОЙТИ',
  'login.forgotPassword': 'Забыли пароль?',
  'login.backToSignIn': 'Назад ко входу',
  'login.needAccount': 'Нет аккаунта?',
  'login.haveAccount': 'Уже есть аккаунт?',
  'login.registerNow': 'Зарегистрироваться',
  'login.signInNow': 'Войти',
});

Object.assign(translations.en, {
  'countdown.applied': 'Auto reject is being applied.',
  'countdown.inDays': 'Auto reject in {days}d {hours}h {minutes}m',
  'countdown.inHours': 'Auto reject in {hours}h {minutes}m',
  'countdown.inMinutes': 'Auto reject in {minutes}m {seconds}s',
  'countdown.inSeconds': 'Auto reject in {seconds}s',
});

Object.assign(translations.az, {
  'countdown.applied': 'Avto imtina tətbiq olunur.',
  'countdown.inDays': 'Avto imtinaya {days}g {hours}s {minutes}d',
  'countdown.inHours': 'Avto imtinaya {hours}s {minutes}d',
  'countdown.inMinutes': 'Avto imtinaya {minutes}d {seconds}san',
  'countdown.inSeconds': 'Avto imtinaya {seconds}san',
});

Object.assign(translations.ru, {
  'countdown.applied': 'Автоотказ применяется.',
  'countdown.inDays': 'Автоотказ через {days}д {hours}ч {minutes}м',
  'countdown.inHours': 'Автоотказ через {hours}ч {minutes}м',
  'countdown.inMinutes': 'Автоотказ через {minutes}м {seconds}с',
  'countdown.inSeconds': 'Автоотказ через {seconds}с',
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
  'nominations.title': 'Təyinatlar',
  'nominations.myTitle': 'Mənim təyinatlarım',
  'reports.title': 'Reportlar',
  'reports.myTitle': 'Mənim reportlarım',
  'news.title': 'Xəbərlər',
  'members.title': 'Bütün üzvlər',
  'activity.title': 'Aktivlik',
  'teyinat.title': 'Təyinat',
  'dashboard.navRanking': 'Reytinq',
  'dashboard.navMyRanking': 'Mənim reytinqim',
  'dashboard.navTORanking': 'TO reytinqi',
  'dashboard.gameDay': 'Oyun günü!',
  'dashboard.gameDayWish': 'Bu gün uğurlar. Diqqətli olun və oyununuz yaxşı keçsin.',
  'dashboard.accept': 'Qəbul et',
  'dashboard.decline': 'İmtina et',
});

Object.assign(translations.ru, {
  'nominations.title': 'Назначения',
  'nominations.myTitle': 'Мои назначения',
  'reports.title': 'Отчеты',
  'reports.myTitle': 'Мои отчеты',
  'news.title': 'Новости',
  'members.title': 'Все участники',
  'activity.title': 'Активность',
  'teyinat.title': 'Teyinat',
  'dashboard.navRanking': 'Рейтинг',
  'dashboard.navMyRanking': 'Мой рейтинг',
  'dashboard.navTORanking': 'Рейтинг TO',
  'dashboard.gameDay': 'День игры!',
  'dashboard.gameDayWish': 'Удачи сегодня. Будьте собраны и проведите отличный матч.',
  'dashboard.accept': 'Принять',
  'dashboard.decline': 'Отказаться',
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
  'dashboard.createdNominations': 'Yaradılmış təyinatlar',
  'dashboard.upcomingGames': 'Qarşıdakı oyunlar',
  'dashboard.pastGames': 'Keçmiş oyunlar',
  'dashboard.noUpcomingNominations': 'Qarşıdakı təyinat yoxdur.',
  'dashboard.noUpcomingGames': 'Qarşıdakı oyun yoxdur.',
  'dashboard.noUpcomingGamesYet': 'Hələ qarşıdakı oyun yoxdur.',
  'dashboard.noPastGamesYet': 'Hələ keçmiş oyun yoxdur.',
  'dashboard.createdByLabel': 'Yaradan: {name}',
  'dashboard.deleteGame': 'Oyunu sil',
  'dashboard.selectReplacementOfficial': 'Əvəzləyici rəsmi şəxs seçin',
  'dashboard.replaceSlot': '{slot} əvəz et',
  'dashboard.replacing': 'Əvəzlənir...',
  'dashboard.noFreeReferee': 'Bu slot üçün boş hakim yoxdur.',
  'dashboard.gamesAwaitingTOCrew': 'TO heyəti gözləyən oyunlar',
  'dashboard.selectTO': 'TO seçin',
  'dashboard.saveTOCrew': 'TO heyətini saxla',
  'dashboard.savingTOCrew': 'TO heyəti saxlanılır...',
  'dashboard.saveCrew': 'Brigadanı saxla',
  'dashboard.toCrewLocked': 'Oyun başladıqdan sonra TO heyəti artıq təyin edilə bilməz.',
  'dashboard.toCrewWillAppear': 'TO heyəti TO Supervisor rəsmi şəxsləri təyin edib oyunu qəbul etdikdən sonra görünəcək.',
  'dashboard.replacementNotices': 'Əvəzlənmə bildirişləri',
  'dashboard.noDeclinedYet': 'Heç bir hakim hələ oyundan imtina etməyib.',
  'dashboard.declinedGame': '{name} oyundan imtina etdi',
  'dashboard.newOfficial': 'Yeni rəsmi şəxs: {name}',
  'dashboard.myGameAssignments': 'Mənim oyun təyinatlarım',
  'dashboard.gameAssignments': 'Oyun təyinatları',
  'dashboard.upcomingAssignedGames': 'Qarşıdakı təyin olunmuş oyunlar',
});

Object.assign(translations.ru, {
  'dashboard.createdNominations': 'Созданные назначения',
  'dashboard.upcomingGames': 'Предстоящие игры',
  'dashboard.pastGames': 'Прошедшие игры',
  'dashboard.noUpcomingNominations': 'Нет предстоящих назначений.',
  'dashboard.noUpcomingGames': 'Нет предстоящих игр.',
  'dashboard.noUpcomingGamesYet': 'Предстоящих игр пока нет.',
  'dashboard.noPastGamesYet': 'Прошедших игр пока нет.',
  'dashboard.createdByLabel': 'Создал: {name}',
  'dashboard.deleteGame': 'Удалить игру',
  'dashboard.selectReplacementOfficial': 'Выберите замену',
  'dashboard.replaceSlot': 'Заменить {slot}',
  'dashboard.replacing': 'Замена...',
  'dashboard.noFreeReferee': 'Нет свободного судьи для этой позиции.',
  'dashboard.gamesAwaitingTOCrew': 'Игры, ожидающие бригаду TO',
  'dashboard.selectTO': 'Выберите TO',
  'dashboard.saveTOCrew': 'Сохранить бригаду TO',
  'dashboard.savingTOCrew': 'Сохранение бригады TO...',
  'dashboard.saveCrew': 'Сохранить бригаду',
  'dashboard.toCrewLocked': 'После начала матча бригаду TO назначать нельзя.',
  'dashboard.toCrewWillAppear': 'Бригада TO появится после того, как TO Supervisor назначит сотрудников и они примут игру.',
  'dashboard.replacementNotices': 'Уведомления о замене',
  'dashboard.noDeclinedYet': 'Пока ни один судья не отказался от игры.',
  'dashboard.declinedGame': '{name} отказался от игры',
  'dashboard.newOfficial': 'Новый судья: {name}',
  'dashboard.myGameAssignments': 'Мои назначения',
  'dashboard.gameAssignments': 'Назначения на игры',
  'dashboard.upcomingAssignedGames': 'Предстоящие назначенные игры',
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
  'dashboard.instructorPanel': 'İnstruktor paneli',
  'dashboard.toSupervisorPanel': 'TO Supervisor paneli',
  'dashboard.staffPanel': 'Staff paneli',
  'dashboard.toDashboard': 'TO paneli',
  'dashboard.refZoneDashboard': 'RefZone paneli',
  'dashboard.instructorControls': 'İnstruktor idarəetməsi',
  'dashboard.instructorControlsHelp': 'Təyinat yarat, üzvləri düzəlt və qeydiyyat girişini idarə et.',
  'dashboard.allMembers': 'Bütün üzvlər',
  'dashboard.addAccess': 'Giriş əlavə et',
  'dashboard.createNomination': 'Təyinat yarat',
  'dashboard.instructorNotifications': 'İnstruktor bildirişləri',
});

Object.assign(translations.ru, {
  'dashboard.creatingNomination': 'Создание...',
  'dashboard.saveNomination': 'Сохранить назначение',
  'dashboard.instructorPanel': 'Панель инструктора',
  'dashboard.toSupervisorPanel': 'Панель TO Supervisor',
  'dashboard.staffPanel': 'Панель Staff',
  'dashboard.toDashboard': 'Панель TO',
  'dashboard.refZoneDashboard': 'Панель RefZone',
  'dashboard.instructorControls': 'Управление инструктора',
  'dashboard.instructorControlsHelp': 'Создавайте назначения, редактируйте участников и управляйте доступом к регистрации.',
  'dashboard.allMembers': 'Все участники',
  'dashboard.addAccess': 'Добавить доступ',
  'dashboard.createNomination': 'Создать назначение',
  'dashboard.instructorNotifications': 'Уведомления инструктора',
});

Object.assign(translations.en, {
  'access.title': 'Add Access',
  'access.grantTitle': 'Grant Access',
  'access.grantHelp': 'Allow a specific e-mail and role to register in RefZone.',
  'access.allowedList': 'Allowed Access List',
  'access.loading': 'Loading access list...',
  'access.none': 'No access entries yet.',
  'access.add': 'Add Access',
});

Object.assign(translations.az, {
  'access.title': 'Giriş əlavə et',
  'access.grantTitle': 'Giriş icazəsi ver',
  'access.grantHelp': 'Müəyyən e-mail və rola RefZone qeydiyyatı üçün icazə verin.',
  'access.allowedList': 'İcazə verilən giriş siyahısı',
  'access.loading': 'Giriş siyahısı yüklənir...',
  'access.none': 'Hələ giriş qeydi yoxdur.',
  'access.add': 'Giriş əlavə et',
});

Object.assign(translations.ru, {
  'access.title': 'Добавить доступ',
  'access.grantTitle': 'Выдать доступ',
  'access.grantHelp': 'Разрешите конкретному e-mail и роли зарегистрироваться в RefZone.',
  'access.allowedList': 'Список разрешённого доступа',
  'access.loading': 'Загрузка списка доступа...',
  'access.none': 'Записей доступа пока нет.',
  'access.add': 'Добавить доступ',
});

Object.assign(translations.en, {
  'activity.last24h': 'Last 24 Hours',
  'activity.help': 'Recent member activity and last seen timestamps.',
  'activity.onlyInstructor': 'Only instructors can review full activity.',
  'activity.loading': 'Loading activity...',
  'activity.none': 'No recent activity found.',
  'members.list': 'Members List',
  'members.loading': 'Loading members...',
  'members.none': 'No members found.',
  'members.miniProfile': 'Mini Profile',
  'members.selectToEdit': 'Select a member to edit their profile.',
  'members.saveProfile': 'Save Profile',
  'members.deleteMember': 'Delete Member',
  'members.cannotDeleteSelf': 'You cannot delete yourself',
  'news.addPost': 'Add Post',
  'news.commentary': 'Commentary',
  'news.commentaryPlaceholder': 'Write a short description for this video.',
  'news.addButton': 'Add News',
  'news.loading': 'Loading news...',
  'news.none': 'No news posts yet.',
  'news.invalidYoutube': 'This YouTube link could not be previewed.',
  'news.postedBy': 'Posted by {name}',
  'news.openOnYoutube': 'Open on YouTube',
  'teyinat.onlyInstructor': 'Only instructors can export Teyinat.',
  'teyinat.exportTitle': 'Export Teyinat PDF',
  'teyinat.exportHelp': 'Select games, assign their groups, and download the PDF.',
  'teyinat.selectedCount': '{count} of {max} games selected',
  'teyinat.generating': 'Generating PDF...',
  'teyinat.downloadPdf': 'Download PDF',
  'teyinat.loadingGames': 'Loading games...',
  'teyinat.none': 'No games available for export.',
  'teyinat.group': 'Group',
  'teyinat.groupA': 'Group A',
  'teyinat.groupB': 'Group B',
  'nominations.loading': 'Loading nominations...',
});

Object.assign(translations.az, {
  'activity.last24h': 'Son 24 saat',
  'activity.help': 'Üzvlərin son aktivliyi və sistemdə görünmə vaxtı.',
  'activity.onlyInstructor': 'Tam aktivlik siyahısını yalnız instruktor görə bilər.',
  'activity.loading': 'Aktivlik yüklənir...',
  'activity.none': 'Son aktivlik tapılmadı.',
  'members.list': 'Üzvlər siyahısı',
  'members.loading': 'Üzvlər yüklənir...',
  'members.none': 'Üzv tapılmadı.',
  'members.miniProfile': 'Mini profil',
  'members.selectToEdit': 'Profili redaktə etmək üçün üzv seçin.',
  'members.saveProfile': 'Profili saxla',
  'members.deleteMember': 'Üzvü sil',
  'members.cannotDeleteSelf': 'Öz hesabınızı silə bilməzsiniz',
  'news.addPost': 'Paylaşım əlavə et',
  'news.commentary': 'Şərh',
  'news.commentaryPlaceholder': 'Bu video üçün qısa təsvir yazın.',
  'news.addButton': 'Xəbər əlavə et',
  'news.loading': 'Xəbərlər yüklənir...',
  'news.none': 'Hələ xəbər paylaşımı yoxdur.',
  'news.invalidYoutube': 'Bu YouTube keçidini önizləmək mümkün olmadı.',
  'news.postedBy': 'Paylaşan: {name}',
  'news.openOnYoutube': 'YouTube-da aç',
  'teyinat.onlyInstructor': 'Təyinat PDF-ni yalnız instruktor ixrac edə bilər.',
  'teyinat.exportTitle': 'Təyinat PDF ixracı',
  'teyinat.exportHelp': 'Oyunları seçin, qruplarını təyin edin və PDF-i yükləyin.',
  'teyinat.selectedCount': '{max} oyundan {count} seçildi',
  'teyinat.generating': 'PDF hazırlanır...',
  'teyinat.downloadPdf': 'PDF yüklə',
  'teyinat.loadingGames': 'Oyunlar yüklənir...',
  'teyinat.none': 'İxrac üçün oyun yoxdur.',
  'teyinat.group': 'Qrup',
  'teyinat.groupA': 'A qrupu',
  'teyinat.groupB': 'B qrupu',
  'nominations.loading': 'Təyinatlar yüklənir...',
});

Object.assign(translations.ru, {
  'activity.last24h': 'Последние 24 часа',
  'activity.help': 'Недавняя активность участников и время последнего посещения.',
  'activity.onlyInstructor': 'Полную активность может просматривать только инструктор.',
  'activity.loading': 'Загрузка активности...',
  'activity.none': 'Недавняя активность не найдена.',
  'members.list': 'Список участников',
  'members.loading': 'Загрузка участников...',
  'members.none': 'Участники не найдены.',
  'members.miniProfile': 'Мини-профиль',
  'members.selectToEdit': 'Выберите участника для редактирования профиля.',
  'members.saveProfile': 'Сохранить профиль',
  'members.deleteMember': 'Удалить участника',
  'members.cannotDeleteSelf': 'Вы не можете удалить себя',
  'news.addPost': 'Добавить публикацию',
  'news.commentary': 'Комментарий',
  'news.commentaryPlaceholder': 'Добавьте короткое описание к этому видео.',
  'news.addButton': 'Добавить новость',
  'news.loading': 'Загрузка новостей...',
  'news.none': 'Публикаций пока нет.',
  'news.invalidYoutube': 'Не удалось показать предпросмотр этой ссылки YouTube.',
  'news.postedBy': 'Опубликовал: {name}',
  'news.openOnYoutube': 'Открыть на YouTube',
  'teyinat.onlyInstructor': 'Экспорт Teyinat PDF доступен только инструктору.',
  'teyinat.exportTitle': 'Экспорт Teyinat PDF',
  'teyinat.exportHelp': 'Выберите игры, назначьте им группы и скачайте PDF.',
  'teyinat.selectedCount': 'Выбрано {count} из {max} игр',
  'teyinat.generating': 'Создание PDF...',
  'teyinat.downloadPdf': 'Скачать PDF',
  'teyinat.loadingGames': 'Загрузка игр...',
  'teyinat.none': 'Нет игр для экспорта.',
  'teyinat.group': 'Группа',
  'teyinat.groupA': 'Группа A',
  'teyinat.groupB': 'Группа B',
  'nominations.loading': 'Загрузка назначений...',
});

Object.assign(translations.en, {
  'ranking.myTORankingTitle': 'My TO Ranking',
  'ranking.failedToLoad': 'Failed to load rankings.',
  'ranking.saved': 'Match performance saved.',
  'ranking.failedToSave': 'Failed to save performance.',
  'ranking.loading': 'Loading ranking data...',
  'ranking.performanceScale': 'Performance Scale',
  'ranking.scaleVeryGood': 'very good',
  'ranking.scaleNormal': 'normal',
  'ranking.scaleImprove': 'must improve',
  'ranking.adminTitle': '{entity} Ranking Admin',
  'ranking.adminHelp': '`Match Performance Sheet` saves one game. `Total Performance Sheet` is calculated automatically from all saved matches. `AVG` = match criteria sum / {count}, then average of all match averages for that {entity}.',
  'ranking.matchPerformanceSheet': 'Match Performance Sheet',
  'ranking.selectEntity': 'Select {entity}',
  'ranking.gameNumber': 'Game Number',
  'ranking.selectExistingGame': 'Select existing game',
  'ranking.total': 'Total',
  'ranking.note': 'Note',
  'ranking.correction': 'Correction',
  'ranking.currentMatchAverage': 'Current match average: {value}',
  'ranking.saveMatchPerformance': 'Save Match Performance',
  'ranking.totalPerformanceSheet': 'Total Performance Sheet',
  'ranking.currentPosition': 'Current Position',
  'ranking.avgPerformance': 'AVG performance: {value}',
  'ranking.totalWithValue': 'Total {value}',
  'ranking.rank': 'Rank',
  'ranking.fullRanking': 'Full Ranking',
  'ranking.selectedPositionTrend': 'Selected {entity} Position Trend',
  'ranking.currentRank': 'Current rank: #{rank}',
  'ranking.avgWithValue': 'AVG {value}',
  'ranking.avgShort': 'AVG: {value}',
  'ranking.matchPerformanceHistory': 'Match Performance History',
  'ranking.myMatchPerformanceHistory': 'My Match Performance History',
  'ranking.matchAvg': 'Match AVG: {value}',
  'ranking.summaryTitle': 'Ranking Summary',
  'ranking.summaryText': 'Only your own ranking is visible here. Position changes after each saved match performance sheet.',
});

Object.assign(translations.az, {
  'ranking.myTORankingTitle': 'Mənim TO reytinqim',
  'ranking.failedToLoad': 'Reytinq yüklənmədi.',
  'ranking.saved': 'Oyun performansı saxlanıldı.',
  'ranking.failedToSave': 'Performansı saxlamaq mümkün olmadı.',
  'ranking.loading': 'Reytinq məlumatları yüklənir...',
  'ranking.performanceScale': 'Performans şkalası',
  'ranking.scaleVeryGood': 'çox yaxşı',
  'ranking.scaleNormal': 'normal',
  'ranking.scaleImprove': 'inkişaf lazımdır',
  'ranking.adminTitle': '{entity} reytinq idarəetməsi',
  'ranking.adminHelp': '`Match Performance Sheet` bir oyunu saxlayır. `Total Performance Sheet` bütün saxlanmış oyunlardan avtomatik hesablanır. `AVG` = oyun kriteriyalarının cəmi / {count}, sonra həmin {entity} üçün bütün oyun ortalamalarının ortası.',
  'ranking.matchPerformanceSheet': 'Oyun performans cədvəli',
  'ranking.selectEntity': '{entity} seçin',
  'ranking.gameNumber': 'Oyun nömrəsi',
  'ranking.selectExistingGame': 'Mövcud oyunu seçin',
  'ranking.total': 'Yekun',
  'ranking.note': 'Qeyd',
  'ranking.correction': 'Düzəliş',
  'ranking.currentMatchAverage': 'Cari oyun ortalaması: {value}',
  'ranking.saveMatchPerformance': 'Oyun performansını saxla',
  'ranking.totalPerformanceSheet': 'Ümumi performans cədvəli',
  'ranking.currentPosition': 'Cari mövqe',
  'ranking.avgPerformance': 'Orta performans: {value}',
  'ranking.totalWithValue': 'Yekun {value}',
  'ranking.rank': 'Mövqe',
  'ranking.fullRanking': 'Tam reytinq',
  'ranking.selectedPositionTrend': 'Seçilmiş {entity} mövqe qrafiki',
  'ranking.currentRank': 'Cari mövqe: #{rank}',
  'ranking.avgWithValue': 'Orta {value}',
  'ranking.avgShort': 'Orta: {value}',
  'ranking.matchPerformanceHistory': 'Oyun performans tarixçəsi',
  'ranking.myMatchPerformanceHistory': 'Mənim oyun performans tarixçəm',
  'ranking.matchAvg': 'Oyun ortalaması: {value}',
  'ranking.summaryTitle': 'Reytinq xülasəsi',
  'ranking.summaryText': 'Burada yalnız sizin öz reytinqiniz görünür. Mövqe hər saxlanmış oyun performans cədvəlindən sonra dəyişir.',
});

Object.assign(translations.ru, {
  'ranking.myTORankingTitle': 'Мой рейтинг TO',
  'ranking.failedToLoad': 'Не удалось загрузить рейтинг.',
  'ranking.saved': 'Оценка за матч сохранена.',
  'ranking.failedToSave': 'Не удалось сохранить оценку.',
  'ranking.loading': 'Загрузка данных рейтинга...',
  'ranking.performanceScale': 'Шкала оценки',
  'ranking.scaleVeryGood': 'очень хорошо',
  'ranking.scaleNormal': 'нормально',
  'ranking.scaleImprove': 'нужно улучшить',
  'ranking.adminTitle': 'Управление рейтингом: {entity}',
  'ranking.adminHelp': '`Match Performance Sheet` сохраняет одну игру. `Total Performance Sheet` рассчитывается автоматически по всем сохранённым играм. `AVG` = сумма критериев матча / {count}, затем среднее всех средних значений матчей для {entity}.',
  'ranking.matchPerformanceSheet': 'Лист оценки матча',
  'ranking.selectEntity': 'Выберите: {entity}',
  'ranking.gameNumber': 'Номер игры',
  'ranking.selectExistingGame': 'Выберите существующую игру',
  'ranking.total': 'Итого',
  'ranking.note': 'Комментарий',
  'ranking.correction': 'Коррекция',
  'ranking.currentMatchAverage': 'Текущее среднее за матч: {value}',
  'ranking.saveMatchPerformance': 'Сохранить оценку матча',
  'ranking.totalPerformanceSheet': 'Общий лист оценки',
  'ranking.currentPosition': 'Текущая позиция',
  'ranking.avgPerformance': 'Средняя оценка: {value}',
  'ranking.totalWithValue': 'Итого {value}',
  'ranking.rank': 'Место',
  'ranking.fullRanking': 'Полный рейтинг',
  'ranking.selectedPositionTrend': 'Динамика позиции: {entity}',
  'ranking.currentRank': 'Текущее место: #{rank}',
  'ranking.avgWithValue': 'Среднее {value}',
  'ranking.avgShort': 'Среднее: {value}',
  'ranking.matchPerformanceHistory': 'История оценок матчей',
  'ranking.myMatchPerformanceHistory': 'Моя история оценок матчей',
  'ranking.matchAvg': 'Среднее за матч: {value}',
  'ranking.summaryTitle': 'Сводка рейтинга',
  'ranking.summaryText': 'Здесь виден только ваш собственный рейтинг. Позиция меняется после каждого сохранённого листа оценки матча.',
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
