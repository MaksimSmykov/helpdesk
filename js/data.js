(function () {
  "use strict";

  window.ITN = window.ITN || {};

  var ITN = window.ITN;

  ITN.STORAGE_KEYS = {
    tickets: "itn_tickets_v1",
    profile: "itn_profile_v1",
    missions: "itn_missions_v1",
    diagnosticSession: "itn_diagnostic_session_v1",
    kbRatings: "itn_kb_ratings_v1",
    stats: "itn_stats_v1"
  };

  ITN.STATUS_META = {
    accepted: { label: "Принято", badge: "badge--accepted", order: 1 },
    assigned: { label: "Назначен специалист", badge: "badge--assigned", order: 2 },
    diagnostics: { label: "Диагностика", badge: "badge--diagnostics", order: 3 },
    waiting: { label: "Ожидается действие", badge: "badge--waiting", order: 4 },
    resolved: { label: "Решено", badge: "badge--done", order: 5 }
  };

  ITN.PRIORITY_META = {
    low: { label: "Низкий", badge: "badge--low", slaHours: 72 },
    medium: { label: "Средний", badge: "badge--medium", slaHours: 24 },
    high: { label: "Высокий", badge: "badge--high", slaHours: 8 },
    critical: { label: "Критический", badge: "badge--critical", slaHours: 4 }
  };

  ITN.SPECIALISTS = [
    {
      id: "spec-1",
      name: "Алексей Воронов",
      role: "Системный администратор",
      email: "a.voronov@company.ru",
      workload: 68
    },
    {
      id: "spec-2",
      name: "Мария Кузнецова",
      role: "Инженер поддержки",
      email: "m.kuznetsova@company.ru",
      workload: 45
    },
    {
      id: "spec-3",
      name: "Дмитрий Соколов",
      role: "Специалист по сетям и VPN",
      email: "d.sokolov@company.ru",
      workload: 82
    },
    {
      id: "spec-4",
      name: "Елена Морозова",
      role: "Аналитик IT-сервисов",
      email: "e.morozova@company.ru",
      workload: 35
    }
  ];

  ITN.CATEGORIES = [
    {
      id: "login",
      title: "Не могу войти",
      icon: "🔐",
      description: "Проблемы с паролем, учётной записью или двухфакторной авторизацией"
    },
    {
      id: "network",
      title: "Интернет или VPN",
      icon: "🌐",
      description: "Нет сети, медленное соединение, ошибки VPN или корпоративного Wi‑Fi"
    },
    {
      id: "device",
      title: "Устройство",
      icon: "💻",
      description: "Ноутбук, монитор, периферия, зарядка, перезагрузка"
    },
    {
      id: "software",
      title: "Программа",
      icon: "📦",
      description: "CRM, офисные приложения, ошибки запуска или обновления"
    },
    {
      id: "access",
      title: "Доступ",
      icon: "🗝️",
      description: "Права к системам, папкам, сервисам и внутренним ресурсам"
    },
    {
      id: "install",
      title: "Установка программы",
      icon: "⬇️",
      description: "Запрос на установку или обновление корпоративного ПО"
    },
    {
      id: "other",
      title: "Другая проблема",
      icon: "❓",
      description: "Если категория не подходит — опишите ситуацию своими словами"
    }
  ];

  ITN.DIAGNOSTIC_FLOWS = {
    login: [
      {
        id: "login-q1",
        type: "question",
        title: "Где возникает ошибка входа?",
        text: "Уточните, в какой системе вы не можете авторизоваться — это поможет выбрать правильный маршрут.",
        options: [
          { id: "corp", label: "Корпоративный портал / SSO", next: "login-q2-sso" },
          { id: "mail", label: "Корпоративная почта", next: "login-q2-mail" },
          { id: "app", label: "Рабочее приложение (CRM, ERP)", next: "login-q2-app" }
        ]
      },
      {
        id: "login-q2-sso",
        type: "question",
        title: "Какое сообщение видите?",
        text: "Обратите внимание на текст ошибки на экране входа.",
        options: [
          { id: "wrong-pass", label: "Неверный пароль или логин", next: "login-check-pass" },
          { id: "locked", label: "Учётная запись заблокирована", next: "login-sol-unlock" },
          { id: "2fa", label: "Ошибка двухфакторной авторизации", next: "login-check-2fa" }
        ]
      },
      {
        id: "login-q2-mail",
        type: "question",
        title: "Как вы подключаетесь к почте?",
        text: "Выберите способ, которым обычно работаете с почтой.",
        options: [
          { id: "web", label: "Через браузер (Outlook Web)", next: "login-check-pass" },
          { id: "client", label: "Через Outlook / почтовый клиент", next: "login-check-pass" },
          { id: "mobile", label: "С телефона", next: "login-check-2fa" }
        ]
      },
      {
        id: "login-q2-app",
        type: "question",
        title: "Приложение открывается?",
        text: "Проверьте, доходит ли процесс до экрана логина.",
        options: [
          { id: "yes", label: "Да, но не принимает пароль", next: "login-check-pass" },
          { id: "no", label: "Нет, приложение не запускается", next: "login-sol-restart" },
          { id: "timeout", label: "Долго загружается и обрывается", next: "login-check-network" }
        ]
      },
      {
        id: "login-check-pass",
        type: "check",
        title: "Проверка пароля и синхронизации",
        text: "Выполните базовые шаги восстановления доступа.",
        checks: [
          "Убедитесь, что включена нужная раскладка клавиатуры (RU/EN)",
          "Проверьте пароль на корпоративном портале self-service",
          "Если пароль менялся недавно — выйдите из всех сессий и войдите заново",
          "Очистите кэш браузера или перезапустите почтовый клиент"
        ],
        options: [
          { id: "fixed", label: "Помогло — вошёл успешно", next: "login-sol-done" },
          { id: "continue", label: "Не помогло — продолжить", next: "login-sol-reset" }
        ]
      },
      {
        id: "login-check-2fa",
        type: "check",
        title: "Проверка двухфакторной авторизации",
        text: "Частая причина — рассинхронизация времени или устаревший код.",
        checks: [
          "Проверьте время на телефоне (автоматическая синхронизация включена)",
          "Используйте резервный код из корпоративного профиля безопасности",
          "Удалите старую запись в приложении-аутентификаторе и привяжите заново",
          "Попробуйте вход через резервный канал (SMS, если доступен)"
        ],
        options: [
          { id: "fixed", label: "2FA прошла успешно", next: "login-sol-done" },
          { id: "continue", label: "Код всё ещё не принимается", next: "login-sol-reset" }
        ]
      },
      {
        id: "login-check-network",
        type: "check",
        title: "Проверка сетевого подключения",
        text: "Некоторые приложения не авторизуют пользователя без VPN или корпоративной сети.",
        checks: [
          "Подключитесь к корпоративному VPN",
          "Проверьте доступ к intranet.company.ru",
          "Отключите сторонний VPN или прокси",
          "Перезагрузите роутер Wi‑Fi (если работаете удалённо)"
        ],
        options: [
          { id: "fixed", label: "После VPN вход работает", next: "login-sol-done" },
          { id: "continue", label: "VPN подключён, вход не работает", next: "login-sol-reset" }
        ]
      },
      {
        id: "login-sol-restart",
        type: "solution",
        title: "Перезапуск приложения и служб",
        text: "Закройте приложение полностью, перезапустите компьютер и попробуйте снова.",
        solution: "Полностью закройте приложение через диспетчер задач, перезагрузите ПК и выполните вход через SSO. Если ошибка повторяется — потребуется проверка лицензии приложения IT-отделом."
      },
      {
        id: "login-sol-unlock",
        type: "solution",
        title: "Разблокировка учётной записи",
        text: "После нескольких неудачных попыток входа учётная запись блокируется автоматически.",
        solution: "Подождите 15 минут и попробуйте снова либо воспользуйтесь self-service на портале «Мой профиль → Безопасность → Разблокировать». При повторной блокировке создайте заявку."
      },
      {
        id: "login-sol-reset",
        type: "solution",
        title: "Сброс пароля через self-service",
        text: "Если базовые проверки не помогли, выполните сброс пароля.",
        solution: "Перейдите на portal.company.ru/reset, подтвердите личность через корпоративную почту или SMS. После смены пароля обновите его во всех сохранённых сессиях. Если сброс недоступен — передайте заявку специалисту."
      },
      {
        id: "login-sol-done",
        type: "solution",
        title: "Доступ восстановлен",
        text: "Отлично! Рекомендуем закрепить результат.",
        solution: "Включите двухфакторную авторизацию и сохраните резервные коды. Это снизит риск повторной блокировки учётной записи."
      }
    ],

    network: [
      {
        id: "network-q1",
        type: "question",
        title: "Что именно не работает?",
        text: "Выберите наиболее близкое описание проблемы.",
        options: [
          { id: "no-internet", label: "Нет интернета совсем", next: "network-q2-place" },
          { id: "slow", label: "Интернет очень медленный", next: "network-check-speed" },
          { id: "vpn", label: "Не подключается VPN", next: "network-q2-vpn" }
        ]
      },
      {
        id: "network-q2-place",
        type: "question",
        title: "Где вы работаете?",
        text: "Место работы влияет на доступные способы диагностики.",
        options: [
          { id: "office", label: "В офисе (кабель или Wi‑Fi)", next: "network-check-cable" },
          { id: "remote", label: "Удалённо из дома", next: "network-check-router" },
          { id: "mobile", label: "С мобильного интернета", next: "network-check-mobile" }
        ]
      },
      {
        id: "network-q2-vpn",
        type: "question",
        title: "Какая ошибка VPN?",
        text: "Посмотрите код или текст в клиенте VPN.",
        options: [
          { id: "auth", label: "Ошибка авторизации", next: "network-check-vpn-auth" },
          { id: "timeout", label: "Таймаут подключения", next: "network-check-vpn-route" },
          { id: "cert", label: "Ошибка сертификата", next: "network-sol-cert" }
        ]
      },
      {
        id: "network-check-cable",
        type: "check",
        title: "Проверка офисного подключения",
        text: "Выполните шаги для проверки локальной сети в офисе.",
        checks: [
          "Проверьте, что сетевой кабель или Wi‑Fi подключены",
          "Перезагрузите сетевой адаптер в настройках Windows",
          "Попробуйте подключиться к гостевой сети для сравнения",
          "Спросите коллег рядом — работает ли у них интернет"
        ],
        options: [
          { id: "fixed", label: "Сеть восстановилась", next: "network-sol-done" },
          { id: "continue", label: "Проблема сохраняется", next: "network-sol-ticket" }
        ]
      },
      {
        id: "network-check-router",
        type: "check",
        title: "Проверка домашнего подключения",
        text: "Часто помогает перезагрузка роутера и проверка DNS.",
        checks: [
          "Перезагрузите роутер на 30 секунд",
          "Подключите ноутбук к роутеру по кабелю",
          "Выполните ping 8.8.8.8 в командной строке",
          "Временно отключите VPN и проверьте обычный интернет"
        ],
        options: [
          { id: "fixed", label: "Интернет заработал", next: "network-sol-done" },
          { id: "continue", label: "Интернет не появился", next: "network-sol-ticket" }
        ]
      },
      {
        id: "network-check-mobile",
        type: "check",
        title: "Проверка мобильного интернета",
        text: "Убедитесь, что проблема не в тарифе или зоне покрытия.",
        checks: [
          "Включите и выключите режим «В самолёте»",
          "Проверьте, не исчерпан ли лимит мобильных данных",
          "Попробуйте другую точку доступа Wi‑Fi",
          "Перезагрузите телефон или модем"
        ],
        options: [
          { id: "fixed", label: "Подключение восстановлено", next: "network-sol-done" },
          { id: "continue", label: "Не помогло", next: "network-sol-ticket" }
        ]
      },
      {
        id: "network-check-speed",
        type: "check",
        title: "Диагностика низкой скорости",
        text: "Замедление может быть связано с VPN, загрузками или фоновыми обновлениями.",
        checks: [
          "Закройте торренты и стриминговые сервисы",
          "Отключите VPN и сравните скорость",
          "Проверьте загрузку CPU в диспетчере задач",
          "Запустите speedtest и сохраните результат"
        ],
        options: [
          { id: "fixed", label: "Скорость нормализовалась", next: "network-sol-done" },
          { id: "continue", label: "Скорость всё ещё низкая", next: "network-sol-ticket" }
        ]
      },
      {
        id: "network-check-vpn-auth",
        type: "check",
        title: "Проверка учётных данных VPN",
        text: "Убедитесь, что используете актуальный пароль и профиль VPN.",
        checks: [
          "Проверьте логин в формате ivan.petrov@company.ru",
          "Обновите пароль, если недавно меняли его в AD",
          "Удалите и заново импортируйте профиль VPN",
          "Проверьте, не истёк ли срок действия сертификата"
        ],
        options: [
          { id: "fixed", label: "VPN подключился", next: "network-sol-done" },
          { id: "continue", label: "Ошибка авторизации осталась", next: "network-sol-ticket" }
        ]
      },
      {
        id: "network-check-vpn-route",
        type: "check",
        title: "Проверка маршрутизации VPN",
        text: "Таймаут часто связан с блокировкой порта или антивирусом.",
        checks: [
          "Временно отключите сторонний антивирус/firewall",
          "Проверьте, что порт UDP 500/4500 не заблокирован",
          "Подключитесь к резервному VPN-шлюзу vpn2.company.ru",
          "Перезапустите службу VPN-клиента от имени администратора"
        ],
        options: [
          { id: "fixed", label: "Подключение установлено", next: "network-sol-done" },
          { id: "continue", label: "Таймаут повторяется", next: "network-sol-ticket" }
        ]
      },
      {
        id: "network-sol-cert",
        type: "solution",
        title: "Обновление сертификата VPN",
        text: "Ошибка сертификата означает, что клиент использует устаревший профиль.",
        solution: "Скачайте новый профиль VPN с portal.company.ru/vpn и импортируйте его. Удалите старый профиль перед импортом. Если ошибка сохраняется — потребуется перевыпуск сертификата."
      },
      {
        id: "network-sol-done",
        type: "solution",
        title: "Сеть работает штатно",
        text: "Подключение восстановлено. Рекомендуем зафиксировать настройки.",
        solution: "Сохраните рабочий профиль VPN и добавьте резервный шлюз. При повторных сбоях проверьте журнал VPN-клиента перед обращением в IT."
      },
      {
        id: "network-sol-ticket",
        type: "solution",
        title: "Требуется помощь сетевого инженера",
        text: "Локальная диагностика не выявила причину — передайте заявку специалисту.",
        solution: "Приложите к заявке: место работы, тип подключения, текст ошибки VPN, результат ping и speedtest. Это ускорит решение на стороне IT."
      }
    ],

    device: [
      {
        id: "device-q1",
        type: "question",
        title: "Что происходит с устройством?",
        text: "Выберите основной симптом.",
        options: [
          { id: "no-power", label: "Не включается / не заряжается", next: "device-check-power" },
          { id: "slow", label: "Работает медленно или зависает", next: "device-check-perf" },
          { id: "peripheral", label: "Не работает монитор, мышь или клавиатура", next: "device-check-peripheral" }
        ]
      },
      {
        id: "device-check-power",
        type: "check",
        title: "Проверка питания",
        text: "Убедитесь, что проблема не в кабеле или розетке.",
        checks: [
          "Проверьте индикатор зарядки на ноутбуке",
          "Попробуйте другую розетку и блок питания",
          "Отключите все USB-устройства и перезагрузите",
          "Удерживайте кнопку питания 10 секунд для принудительной перезагрузки"
        ],
        options: [
          { id: "fixed", label: "Устройство включилось", next: "device-sol-done" },
          { id: "continue", label: "Не включается", next: "device-sol-repair" }
        ]
      },
      {
        id: "device-check-perf",
        type: "check",
        title: "Проверка производительности",
        text: "Зависания часто связаны с нехваткой памяти или фоновыми процессами.",
        checks: [
          "Перезагрузите компьютер",
          "Закройте неиспользуемые вкладки браузера",
          "Проверьте свободное место на диске (минимум 15%)",
          "Запустите «Диспетчер задач» и найдите процессы с высокой нагрузкой"
        ],
        options: [
          { id: "fixed", label: "Стало работать быстрее", next: "device-sol-done" },
          { id: "continue", label: "Всё ещё тормозит", next: "device-sol-upgrade" }
        ]
      },
      {
        id: "device-check-peripheral",
        type: "check",
        title: "Проверка периферии",
        text: "Проверьте физическое подключение и драйверы.",
        checks: [
          "Переподключите кабель USB/HDMI",
          "Попробуйте другой порт на ноутбуке",
          "Проверьте устройство на другом компьютере",
          "Обновите драйверы в «Диспетчере устройств»"
        ],
        options: [
          { id: "fixed", label: "Периферия заработала", next: "device-sol-done" },
          { id: "continue", label: "Не работает", next: "device-sol-repair" }
        ]
      },
      {
        id: "device-sol-done",
        type: "solution",
        title: "Устройство работает",
        text: "Проблема устранена. Рекомендуем профилактику.",
        solution: "Планируйте перезагрузку рабочего ПК раз в неделю и следите за свободным местом на диске. Это снижает риск повторных зависаний."
      },
      {
        id: "device-sol-repair",
        type: "solution",
        title: "Требуется диагностика оборудования",
        text: "Аппаратная неисправность требует осмотра IT-отделом.",
        solution: "Оформите заявку с указанием модели устройства, инвентарного номера и симптомов. При необходимости будет выдано подменное оборудование."
      },
      {
        id: "device-sol-upgrade",
        type: "solution",
        title: "Оптимизация или замена",
        text: "Если перезагрузка и очистка не помогли, возможно требуется апгрейд RAM или замена диска.",
        solution: "Создайте заявку с результатами «Диспетчера задач» и информацией о модели ноутбука. IT оценит необходимость апгрейда или замены."
      }
    ],

    software: [
      {
        id: "software-q1",
        type: "question",
        title: "Какая программа вызывает проблему?",
        text: "Укажите тип приложения.",
        options: [
          { id: "office", label: "Microsoft Office / Teams", next: "software-check-office" },
          { id: "crm", label: "CRM / ERP / 1С", next: "software-check-crm" },
          { id: "other", label: "Другое корпоративное ПО", next: "software-q2-error" }
        ]
      },
      {
        id: "software-q2-error",
        type: "question",
        title: "Когда появляется ошибка?",
        text: "Это поможет определить причину.",
        options: [
          { id: "start", label: "При запуске", next: "software-check-reinstall" },
          { id: "work", label: "Во время работы", next: "software-check-update" },
          { id: "save", label: "При сохранении файла", next: "software-check-storage" }
        ]
      },
      {
        id: "software-check-office",
        type: "check",
        title: "Проверка Office и Teams",
        text: "Типовые шаги для офисных приложений.",
        checks: [
          "Закройте все окна Office и перезапустите приложение",
          "Выполните «Безопасный режим» через Win+R → outlook.exe /safe",
          "Проверьте обновления Windows и Office",
          "Очистите кэш Teams: %appdata%\\Microsoft\\Teams\\Cache"
        ],
        options: [
          { id: "fixed", label: "Приложение работает", next: "software-sol-done" },
          { id: "continue", label: "Ошибка повторяется", next: "software-sol-repair" }
        ]
      },
      {
        id: "software-check-crm",
        type: "check",
        title: "Проверка CRM / ERP",
        text: "Бизнес-приложения часто требуют VPN и актуальных прав.",
        checks: [
          "Подключитесь к корпоративному VPN",
          "Проверьте доступ к серверу приложения через браузер",
          "Очистите кэш браузера или перезапустите толстый клиент",
          "Убедитесь, что лицензия не истекла (статус в профиле)"
        ],
        options: [
          { id: "fixed", label: "CRM работает", next: "software-sol-done" },
          { id: "continue", label: "Не помогло", next: "software-sol-repair" }
        ]
      },
      {
        id: "software-check-reinstall",
        type: "check",
        title: "Переустановка приложения",
        text: "Повреждённые файлы часто восстанавливаются переустановкой.",
        checks: [
          "Удалите приложение через «Параметры → Приложения»",
          "Перезагрузите компьютер",
          "Установите последнюю версию из корпоративного каталога",
          "Запустите от имени администратора (если разрешено политикой)"
        ],
        options: [
          { id: "fixed", label: "Запуск успешен", next: "software-sol-done" },
          { id: "continue", label: "Не запускается", next: "software-sol-repair" }
        ]
      },
      {
        id: "software-check-update",
        type: "check",
        title: "Проверка обновлений",
        text: "Ошибки во время работы часто связаны с несовместимостью версий.",
        checks: [
          "Установите последние обновления приложения",
          "Проверьте журнал ошибок Windows (Просмотр событий)",
          "Отключите сторонние плагины и надстройки",
          "Создайте резервную копию данных перед повторным запуском"
        ],
        options: [
          { id: "fixed", label: "Работа стабилизировалась", next: "software-sol-done" },
          { id: "continue", label: "Сбои продолжаются", next: "software-sol-repair" }
        ]
      },
      {
        id: "software-check-storage",
        type: "check",
        title: "Проверка хранилища и прав",
        text: "Ошибки сохранения часто связаны с правами на сетевую папку.",
        checks: [
          "Сохраните файл локально на рабочий стол",
          "Проверьте подключение к сетевому диску S:",
          "Убедитесь, что файл не открыт другим пользователем",
          "Проверьте квоту на сетевом хранилище"
        ],
        options: [
          { id: "fixed", label: "Файл сохранился", next: "software-sol-done" },
          { id: "continue", label: "Ошибка сохранения", next: "software-sol-repair" }
        ]
      },
      {
        id: "software-sol-done",
        type: "solution",
        title: "Приложение работает штатно",
        text: "Проблема решена. Рекомендуем включить автообновления.",
        solution: "Включите автоматические обновления корпоративного ПО через Software Center. Это предотвращает повторение ошибок совместимости."
      },
      {
        id: "software-sol-repair",
        type: "solution",
        title: "Требуется вмешательство IT",
        text: "Локальная диагностика не помогла — нужен анализ логов.",
        solution: "Создайте заявку с названием программы, версией, текстом ошибки и скриншотом. IT проверит лицензию, права доступа и совместимость."
      }
    ],

    access: [
      {
        id: "access-q1",
        type: "question",
        title: "К какому ресурсу нужен доступ?",
        text: "Выберите тип ресурса.",
        options: [
          { id: "folder", label: "Сетевая папка или файловое хранилище", next: "access-check-folder" },
          { id: "system", label: "Корпоративная система (CRM, BI, HR)", next: "access-check-system" },
          { id: "admin", label: "Административные права", next: "access-q2-admin" }
        ]
      },
      {
        id: "access-q2-admin",
        type: "question",
        title: "Зачем нужны расширенные права?",
        text: "Административные права выдаются по обоснованной необходимости.",
        options: [
          { id: "install", label: "Установка программ", next: "access-sol-request" },
          { id: "config", label: "Настройка системы", next: "access-sol-request" },
          { id: "dev", label: "Разработка / тестирование", next: "access-sol-request" }
        ]
      },
      {
        id: "access-check-folder",
        type: "check",
        title: "Проверка доступа к папке",
        text: "Убедитесь, что проблема не в пути или VPN.",
        checks: [
          "Подключитесь к VPN, если работаете удалённо",
          "Проверьте путь к папке (\\\\fileserver\\dept\\project)",
          "Убедитесь, что запрос на доступ уже согласован руководителем",
          "Попробуйте открыть папку через «Выполнить» (Win+R)"
        ],
        options: [
          { id: "fixed", label: "Папка открылась", next: "access-sol-done" },
          { id: "continue", label: "Доступ запрещён", next: "access-sol-request" }
        ]
      },
      {
        id: "access-check-system",
        type: "check",
        title: "Проверка доступа к системе",
        text: "Проверьте базовые условия авторизации.",
        checks: [
          "Войдите через корпоративный SSO",
          "Проверьте, что ваша роль в HR-системе актуальна",
          "Убедитесь, что прошло время после согласования заявки (до 4 ч)",
          "Очистите кэш браузера и cookies для домена company.ru"
        ],
        options: [
          { id: "fixed", label: "Доступ получен", next: "access-sol-done" },
          { id: "continue", label: "Доступ всё ещё закрыт", next: "access-sol-request" }
        ]
      },
      {
        id: "access-sol-done",
        type: "solution",
        title: "Доступ работает",
        text: "Вы успешно получили доступ к ресурсу.",
        solution: "Сохраните ссылку на ресурс в закладки. При смене отдела или проекта своевременно запросите обновление прав."
      },
      {
        id: "access-sol-request",
        type: "solution",
        title: "Оформление запроса на доступ",
        text: "Для выдачи прав требуется согласование руководителя.",
        solution: "Создайте заявку через каталог IT-услуг «Запрос доступа». Укажите ресурс, обоснование и срок. После согласования права будут выданы автоматически."
      }
    ],

    install: [
      {
        id: "install-q1",
        type: "question",
        title: "Что нужно установить?",
        text: "Выберите тип программного обеспечения.",
        options: [
          { id: "catalog", label: "Программа из корпоративного каталога", next: "install-check-catalog" },
          { id: "new", label: "Новое ПО, которого нет в каталоге", next: "install-q2-new" },
          { id: "update", label: "Обновление существующей программы", next: "install-check-update" }
        ]
      },
      {
        id: "install-q2-new",
        type: "question",
        title: "Для каких задач нужно ПО?",
        text: "Новое ПО проходит проверку информационной безопасности.",
        options: [
          { id: "work", label: "Рабочие задачи (аналитика, дизайн)", next: "install-sol-request" },
          { id: "dev", label: "Разработка", next: "install-sol-request" },
          { id: "personal", label: "Личное использование", next: "install-sol-deny" }
        ]
      },
      {
        id: "install-check-catalog",
        type: "check",
        title: "Установка из Software Center",
        text: "Большинство программ доступны для самостоятельной установки.",
        checks: [
          "Откройте Software Center на рабочем столе",
          "Найдите нужное приложение в каталоге",
          "Нажмите «Установить» и дождитесь завершения",
          "Перезагрузите компьютер, если установщик это запросит"
        ],
        options: [
          { id: "fixed", label: "Установка завершена", next: "install-sol-done" },
          { id: "continue", label: "Ошибка установки", next: "install-sol-ticket" }
        ]
      },
      {
        id: "install-check-update",
        type: "check",
        title: "Обновление программы",
        text: "Обновления часто доступны через тот же каталог.",
        checks: [
          "Откройте Software Center → «Обновления»",
          "Установите все доступные обновления",
          "Закройте программу перед обновлением",
          "Проверьте версию после перезапуска"
        ],
        options: [
          { id: "fixed", label: "Обновление установлено", next: "install-sol-done" },
          { id: "continue", label: "Обновление не ставится", next: "install-sol-ticket" }
        ]
      },
      {
        id: "install-sol-done",
        type: "solution",
        title: "ПО установлено",
        text: "Программа готова к работе.",
        solution: "Ознакомьтесь с инструкцией по лицензированию в базе знаний. Не передавайте установочные файлы коллегам — используйте корпоративный каталог."
      },
      {
        id: "install-sol-deny",
        type: "solution",
        title: "Личное ПО не устанавливается",
        text: "Корпоративная политика запрещает установку личного ПО на рабочие устройства.",
        solution: "Используйте личное устройство для некорпоративных задач. Если программа нужна для работы — оформите запрос через каталог IT-услуг с обоснованием."
      },
      {
        id: "install-sol-request",
        type: "solution",
        title: "Запрос на новое ПО",
        text: "Новое ПО проходит согласование с ИБ и закупками.",
        solution: "Создайте заявку «Установка программы» с названием, версией, обоснованием и ссылкой на сайт производителя. Срок рассмотрения — до 5 рабочих дней."
      },
      {
        id: "install-sol-ticket",
        type: "solution",
        title: "Ошибка установки — нужна помощь IT",
        text: "Установщик завершился с ошибкой.",
        solution: "Создайте заявку с кодом ошибки установщика и скриншотом. IT проверит политики групповых объектов, свободное место и права на установку."
      }
    ],

    other: [
      {
        id: "other-q1",
        type: "question",
        title: "Опишите область проблемы",
        text: "Выберите наиболее близкую область — это поможет направить заявку нужному специалисту.",
        options: [
          { id: "hardware", label: "Оборудование или рабочее место", next: "other-check-basic" },
          { id: "process", label: "Процесс или инструкция", next: "other-check-kb" },
          { id: "unknown", label: "Не знаю / сложно описать", next: "other-q2-detail" }
        ]
      },
      {
        id: "other-q2-detail",
        type: "question",
        title: "Когда проблема началась?",
        text: "Это поможет IT понять, связано ли это с недавними изменениями.",
        options: [
          { id: "today", label: "Сегодня", next: "other-check-basic" },
          { id: "week", label: "На этой неделе", next: "other-check-basic" },
          { id: "long", label: "Давно, но мешает работе", next: "other-sol-ticket" }
        ]
      },
      {
        id: "other-check-basic",
        type: "check",
        title: "Базовая диагностика",
        text: "Универсальные шаги, которые часто помогают.",
        checks: [
          "Перезагрузите компьютер",
          "Проверьте подключение к VPN и интернету",
          "Убедитесь, что проблема воспроизводится",
          "Сделайте скриншот или запишите текст ошибки"
        ],
        options: [
          { id: "fixed", label: "Проблема решилась", next: "other-sol-done" },
          { id: "continue", label: "Не помогло", next: "other-check-kb" }
        ]
      },
      {
        id: "other-check-kb",
        type: "check",
        title: "Поиск в базе знаний",
        text: "Возможно, решение уже описано в инструкциях.",
        checks: [
          "Откройте раздел «База знаний»",
          "Введите ключевые слова проблемы в поиск",
          "Проверьте популярные статьи по вашей категории",
          "Попробуйте шаги из инструкции"
        ],
        options: [
          { id: "fixed", label: "Статья помогла", next: "other-sol-done" },
          { id: "continue", label: "Не нашёл решение", next: "other-sol-ticket" }
        ]
      },
      {
        id: "other-sol-done",
        type: "solution",
        title: "Проблема решена",
        text: "Отлично! Если ситуация повторится — вы знаете маршрут.",
        solution: "Добавьте полезную статью в закладки или отметьте её как полезную — это поможет коллегам."
      },
      {
        id: "other-sol-ticket",
        type: "solution",
        title: "Создание заявки для IT",
        text: "Опишите проблему максимально подробно — IT продолжит диагностику.",
        solution: "Укажите: что делали, что ожидали, что получили, когда началось, скриншоты. Чем подробнее описание — тем быстрее решение."
      }
    ]
  };

  ITN.KB_ARTICLES = [
    {
      id: "kb-001",
      title: "Как сбросить пароль через self-service",
      category: "login",
      summary: "Пошаговая инструкция по восстановлению доступа к корпоративным системам без обращения в IT.",
      steps: [
        "Откройте portal.company.ru и нажмите «Забыли пароль?»",
        "Введите корпоративный email ivan.petrov@company.ru",
        "Подтвердите личность через SMS или резервный email",
        "Задайте новый пароль по требованиям безопасности (12+ символов)",
        "Войдите заново во все системы и обновите сохранённые пароли"
      ],
      helpful: 0,
      notHelpful: 0
    },
    {
      id: "kb-002",
      title: "Подключение к корпоративному VPN",
      category: "network",
      summary: "Настройка VPN-клиента для удалённой работы: установка, импорт профиля, типовые ошибки.",
      steps: [
        "Скачайте VPN-клиент с portal.company.ru/vpn",
        "Импортируйте профиль company-vpn.ovpn",
        "Введите логин в формате ivan.petrov@company.ru",
        "Подключитесь к шлюзу vpn1.company.ru",
        "Проверьте доступ к intranet.company.ru"
      ],
      helpful: 0,
      notHelpful: 0
    },
    {
      id: "kb-003",
      title: "Настройка двухфакторной авторизации (2FA)",
      category: "login",
      summary: "Подключение Microsoft Authenticator для защиты учётной записи.",
      steps: [
        "Откройте portal.company.ru/security",
        "Выберите «Настроить двухфакторную авторизацию»",
        "Установите Microsoft Authenticator на телефон",
        "Отсканируйте QR-код и подтвердите тестовый код",
        "Сохраните резервные коды в надёжном месте"
      ],
      helpful: 0,
      notHelpful: 0
    },
    {
      id: "kb-004",
      title: "Очистка кэша Microsoft Teams",
      category: "software",
      summary: "Если Teams не запускается или зависает — очистка кэша часто решает проблему.",
      steps: [
        "Полностью закройте Teams через диспетчер задач",
        "Нажмите Win+R и введите %appdata%\\Microsoft\\Teams",
        "Удалите папки Cache, blob_storage, databases, GPUcache",
        "Перезапустите Teams и выполните вход",
        "Дождитесь синхронизации чатов (5–10 минут)"
      ],
      helpful: 0,
      notHelpful: 0
    },
    {
      id: "kb-005",
      title: "Запрос доступа к сетевой папке",
      category: "access",
      summary: "Как оформить запрос на доступ к проектной или департаментской папке.",
      steps: [
        "Получите согласование руководителя по email",
        "Откройте каталог IT-услуг → «Запрос доступа»",
        "Укажите путь к папке и обоснование",
        "Приложите переписку с согласованием",
        "Дождитесь уведомления о выдаче прав (до 4 часов)"
      ],
      helpful: 0,
      notHelpful: 0
    },
    {
      id: "kb-006",
      title: "Установка программ через Software Center",
      category: "install",
      summary: "Самостоятельная установка одобренного корпоративного ПО без заявки в IT.",
      steps: [
        "Откройте Software Center на рабочем столе",
        "Перейдите в «Доступные приложения»",
        "Найдите нужную программу через поиск",
        "Нажмите «Установить» и дождитесь завершения",
        "Перезагрузите ПК, если установщик это запросит"
      ],
      helpful: 0,
      notHelpful: 0
    },
    {
      id: "kb-007",
      title: "Диагностика медленного интернета",
      category: "network",
      summary: "Проверка скорости и устранение типовых причин замедления.",
      steps: [
        "Закройте фоновые загрузки и стриминг",
        "Отключите VPN и проверьте скорость на speedtest.net",
        "Подключите VPN и сравните результат",
        "Перезагрузите роутер (если работаете удалённо)",
        "Сохраните результаты тестов для заявки в IT"
      ],
      helpful: 0,
      notHelpful: 0
    },
    {
      id: "kb-008",
      title: "Подготовка ноутбука к передаче в IT",
      category: "device",
      summary: "Что сделать перед сдачей устройства на диагностику или замену.",
      steps: [
        "Сохраните все рабочие файлы на сетевой диск S:",
        "Синхронизируйте почту и календарь",
        "Запишите инвентарный номер с наклейки на ноутбуке",
        "Опишите симптомы и когда они начались",
        "Передайте зарядное устройство вместе с ноутбуком"
      ],
      helpful: 0,
      notHelpful: 0
    }
  ];

  ITN.SERVICES = [
    {
      id: "svc-access",
      title: "Запрос доступа",
      description: "Получение прав к системам, папкам и внутренним ресурсам с согласованием руководителя.",
      fields: [
        { name: "resource", label: "Ресурс (путь или название системы)", type: "text", required: true },
        { name: "reason", label: "Обоснование", type: "textarea", required: true },
        { name: "manager", label: "Email руководителя", type: "email", required: true },
        { name: "duration", label: "Срок доступа", type: "select", required: true }
      ]
    },
    {
      id: "svc-install",
      title: "Установка программы",
      description: "Запрос на установку или обновление программного обеспечения, отсутствующего в каталоге.",
      fields: [
        { name: "software", label: "Название программы", type: "text", required: true },
        { name: "version", label: "Версия", type: "text", required: false },
        { name: "reason", label: "Для каких задач нужна", type: "textarea", required: true },
        { name: "link", label: "Ссылка на сайт производителя", type: "url", required: false }
      ]
    },
    {
      id: "svc-workplace",
      title: "Подготовка рабочего места",
      description: "Настройка рабочего места для нового сотрудника или при смене отдела.",
      fields: [
        { name: "employee", label: "ФИО сотрудника", type: "text", required: true },
        { name: "department", label: "Отдел", type: "text", required: true },
        { name: "startDate", label: "Дата выхода", type: "date", required: true },
        { name: "equipment", label: "Необходимое оборудование", type: "textarea", required: true }
      ]
    },
    {
      id: "svc-equipment",
      title: "Заказ оборудования",
      description: "Заявка на монитор, док-станцию, гарнитуру или другое периферийное оборудование.",
      fields: [
        { name: "item", label: "Тип оборудования", type: "text", required: true },
        { name: "model", label: "Предпочтительная модель", type: "text", required: false },
        { name: "justification", label: "Обоснование", type: "textarea", required: true },
        { name: "urgency", label: "Срочность", type: "select", required: true }
      ]
    },
    {
      id: "svc-account",
      title: "Создание учётной записи",
      description: "Создание корпоративной учётной записи для нового сотрудника или подрядчика.",
      fields: [
        { name: "fullName", label: "ФИО", type: "text", required: true },
        { name: "department", label: "Отдел", type: "text", required: true },
        { name: "role", label: "Должность", type: "text", required: true },
        { name: "manager", label: "Email руководителя", type: "email", required: true }
      ]
    },
    {
      id: "svc-email",
      title: "Настройка корпоративной почты",
      description: "Настройка Outlook, мобильного клиента или переадресации корпоративной почты.",
      fields: [
        { name: "client", label: "Почтовый клиент", type: "select", required: true },
        { name: "device", label: "Устройство", type: "text", required: true },
        { name: "issue", label: "Описание проблемы или запроса", type: "textarea", required: true }
      ]
    }
  ];

  ITN.MISSIONS = [
    {
      id: "mission-2fa",
      title: "Подключить двухфакторную авторизацию",
      description: "Защитите учётную запись — включите 2FA через корпоративный портал безопасности.",
      ticketHint: "Не получается настроить 2FA — код не принимается",
      steps: [
        { id: "s1", title: "Открыть portal.company.ru/security", done: false },
        { id: "s2", title: "Установить Microsoft Authenticator", done: false },
        { id: "s3", title: "Привязать аккаунт по QR-коду", done: false },
        { id: "s4", title: "Сохранить резервные коды", done: false }
      ]
    },
    {
      id: "mission-vpn",
      title: "Настроить VPN для удалённой работы",
      description: "Установите VPN-клиент и проверьте доступ к внутренним ресурсам.",
      ticketHint: "VPN не подключается после настройки",
      steps: [
        { id: "s1", title: "Скачать VPN-клиент с портала", done: false },
        { id: "s2", title: "Импортировать профиль company-vpn", done: false },
        { id: "s3", title: "Подключиться к vpn1.company.ru", done: false },
        { id: "s4", title: "Проверить доступ к intranet", done: false }
      ]
    },
    {
      id: "mission-browser",
      title: "Обновить браузер до актуальной версии",
      description: "Актуальный браузер обеспечивает безопасность и совместимость с корпоративными сервисами.",
      ticketHint: "После обновления браузера не открывается портал",
      steps: [
        { id: "s1", title: "Открыть настройки браузера", done: false },
        { id: "s2", title: "Проверить наличие обновлений", done: false },
        { id: "s3", title: "Установить обновление и перезапустить", done: false },
        { id: "s4", title: "Проверить вход на portal.company.ru", done: false }
      ]
    },
    {
      id: "mission-mail",
      title: "Проверить корпоративную почту",
      description: "Убедитесь, что почта работает на всех устройствах и настроена подпись.",
      ticketHint: "Почта не синхронизируется на телефоне",
      steps: [
        { id: "s1", title: "Войти в Outlook Web", done: false },
        { id: "s2", title: "Проверить правила и подпись", done: false },
        { id: "s3", title: "Настроить почту на телефоне", done: false },
        { id: "s4", title: "Отправить тестовое письмо себе", done: false }
      ]
    }
  ];

  ITN.DEMO_TICKETS = [
    {
      id: "TKT-2026-0142",
      title: "Не могу войти в CRM после смены пароля",
      description: "После смены пароля через self-service CRM не принимает новые учётные данные. VPN подключён.",
      category: "login",
      status: "diagnostics",
      priority: "high",
      assigneeId: "spec-2",
      authorId: "user-1",
      authorName: "Иван Петров",
      device: "Lenovo ThinkPad T14 (INV-45821)",
      createdAt: "2026-07-20T09:15:00.000Z",
      updatedAt: "2026-07-21T14:30:00.000Z",
      dueAt: "2026-07-21T17:15:00.000Z",
      diagnosticSummary: {
        answers: ["Корпоративный портал / SSO", "Неверный пароль или логин"],
        checks: ["Проверка пароля и синхронизации"],
        suggestedCause: "Рассинхронизация пароля между AD и CRM"
      },
      history: [
        { at: "2026-07-20T09:15:00.000Z", status: "accepted", note: "Заявка принята автоматически", actor: "Система" },
        { at: "2026-07-20T11:00:00.000Z", status: "assigned", note: "Назначен специалист Мария Кузнецова", actor: "Диспетчер IT" },
        { at: "2026-07-21T14:30:00.000Z", status: "diagnostics", note: "Проверка синхронизации AD → CRM", actor: "Мария Кузнецова" }
      ]
    },
    {
      id: "TKT-2026-0138",
      title: "VPN обрывается каждые 10 минут",
      description: "При работе из дома VPN подключается, но соединение обрывается через 10–15 минут. Speedtest: 45 Mbps.",
      category: "network",
      status: "waiting",
      priority: "medium",
      assigneeId: "spec-3",
      authorId: "user-1",
      authorName: "Иван Петров",
      device: "Lenovo ThinkPad T14 (INV-45821)",
      createdAt: "2026-07-19T07:40:00.000Z",
      updatedAt: "2026-07-22T08:00:00.000Z",
      dueAt: "2026-07-20T07:40:00.000Z",
      diagnosticSummary: {
        answers: ["Не подключается VPN", "Таймаут подключения"],
        checks: ["Проверка маршрутизации VPN"],
        suggestedCause: "Возможна блокировка UDP-портов провайдером"
      },
      history: [
        { at: "2026-07-19T07:40:00.000Z", status: "accepted", note: "Заявка создана", actor: "Иван Петров" },
        { at: "2026-07-19T10:00:00.000Z", status: "assigned", note: "Назначен Дмитрий Соколов", actor: "Диспетчер IT" },
        { at: "2026-07-20T15:00:00.000Z", status: "diagnostics", note: "Анализ логов VPN-клиента", actor: "Дмитрий Соколов" },
        { at: "2026-07-22T08:00:00.000Z", status: "waiting", note: "Ожидается ответ пользователя: результат ping vpn2", actor: "Дмитрий Соколов" }
      ]
    },
    {
      id: "TKT-2026-0135",
      title: "Запрос доступа к папке \\\\fileserver\\sales\\q3",
      description: "Нужен доступ к папке отдела продаж для подготовки квартального отчёта. Согласование от руководителя приложено.",
      category: "access",
      status: "assigned",
      priority: "low",
      assigneeId: "spec-4",
      authorId: "user-1",
      authorName: "Иван Петров",
      device: "Lenovo ThinkPad T14 (INV-45821)",
      createdAt: "2026-07-18T13:20:00.000Z",
      updatedAt: "2026-07-19T09:00:00.000Z",
      dueAt: "2026-07-21T13:20:00.000Z",
      diagnosticSummary: null,
      history: [
        { at: "2026-07-18T13:20:00.000Z", status: "accepted", note: "Заявка из каталога IT-услуг", actor: "Иван Петров" },
        { at: "2026-07-19T09:00:00.000Z", status: "assigned", note: "Назначена Елена Морозова", actor: "Диспетчер IT" }
      ]
    },
    {
      id: "TKT-2026-0129",
      title: "Teams не запускается после обновления Windows",
      description: "После обновления KB5034441 Teams зависает на экране загрузки. Перезагрузка не помогла.",
      category: "software",
      status: "resolved",
      priority: "medium",
      assigneeId: "spec-1",
      authorId: "user-1",
      authorName: "Иван Петров",
      device: "Lenovo ThinkPad T14 (INV-45821)",
      createdAt: "2026-07-15T10:00:00.000Z",
      updatedAt: "2026-07-16T16:45:00.000Z",
      dueAt: "2026-07-16T10:00:00.000Z",
      diagnosticSummary: {
        answers: ["Microsoft Office / Teams"],
        checks: ["Проверка Office и Teams"],
        suggestedCause: "Повреждённый кэш Teams после обновления ОС"
      },
      history: [
        { at: "2026-07-15T10:00:00.000Z", status: "accepted", note: "Заявка создана", actor: "Иван Петров" },
        { at: "2026-07-15T11:30:00.000Z", status: "assigned", note: "Назначен Алексей Воронов", actor: "Диспетчер IT" },
        { at: "2026-07-16T14:00:00.000Z", status: "diagnostics", note: "Очистка кэша Teams", actor: "Алексей Воронов" },
        { at: "2026-07-16T16:45:00.000Z", status: "resolved", note: "Teams запускается штатно после очистки кэша", actor: "Алексей Воронов" }
      ]
    },
    {
      id: "TKT-2026-0145",
      title: "Заказ док-станции для нового рабочего места",
      description: "Новому сотруднику отдела продаж нужна док-станция Lenovo USB-C с двумя мониторами.",
      category: "device",
      status: "accepted",
      priority: "low",
      assigneeId: null,
      authorId: "user-1",
      authorName: "Иван Петров",
      device: "—",
      createdAt: "2026-07-22T06:30:00.000Z",
      updatedAt: "2026-07-22T06:30:00.000Z",
      dueAt: "2026-07-25T06:30:00.000Z",
      diagnosticSummary: null,
      history: [
        { at: "2026-07-22T06:30:00.000Z", status: "accepted", note: "Заявка из каталога «Заказ оборудования»", actor: "Иван Петров" }
      ]
    }
  ];

  ITN.DEMO_PROFILE = {
    id: "user-1",
    name: "Иван Петров",
    department: "Отдел продаж",
    email: "i.petrov@company.ru",
    phone: "+7 (495) 123-45-67",
    devices: [
      { id: "dev-1", name: "Lenovo ThinkPad T14", inventory: "INV-45821", status: "В работе" },
      { id: "dev-2", name: "iPhone 14", inventory: "INV-45822", status: "Корпоративный" }
    ],
    services: ["Корпоративная почта", "CRM", "VPN", "Teams", "SharePoint"],
    resolvedProblems: [
      { title: "Очистка кэша Teams", date: "2026-07-16" },
      { title: "Настройка подписи в Outlook", date: "2026-06-28" },
      { title: "Подключение к VPN", date: "2026-06-10" }
    ],
    skills: [
      { id: "skill-vpn", name: "Работа с VPN", level: 3, maxLevel: 5 },
      { id: "skill-2fa", name: "Двухфакторная авторизация", level: 2, maxLevel: 5 },
      { id: "skill-office", name: "Microsoft Office", level: 4, maxLevel: 5 },
      { id: "skill-self", name: "Self-service портал", level: 3, maxLevel: 5 }
    ],
    timeSavedMinutes: 240,
    achievements: [
      "Самостоятельно решил 3 проблемы за месяц",
      "Подключил 2FA без обращения в IT",
      "Экономия ~4 часов рабочего времени"
    ]
  };

  ITN.DEFAULT_STATS = {
    incoming: 12,
    inProgress: 8,
    resolved: 48,
    prevented: 156,
    hoursSaved: 89,
    slaCompliance: 94,
    avgResolutionHours: 6.2,
    recurringIssues: [
      { title: "Сброс пароля после блокировки", count: 18 },
      { title: "Очистка кэша Teams", count: 12 },
      { title: "Переподключение VPN", count: 9 }
    ],
    popularCategories: [
      { id: "login", label: "Не могу войти", count: 34 },
      { id: "network", label: "Интернет или VPN", count: 28 },
      { id: "software", label: "Программа", count: 21 },
      { id: "access", label: "Доступ", count: 15 }
    ],
    specialistLoad: [
      { id: "spec-1", name: "Алексей Воронов", tickets: 14, workload: 68 },
      { id: "spec-2", name: "Мария Кузнецова", tickets: 9, workload: 45 },
      { id: "spec-3", name: "Дмитрий Соколов", tickets: 17, workload: 82 },
      { id: "spec-4", name: "Елена Морозова", tickets: 7, workload: 35 }
    ]
  };

  ITN.loadJSON = function (key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null || raw === undefined) {
        return fallback;
      }
      return JSON.parse(raw);
    } catch (error) {
      console.warn("[ITN] loadJSON error:", key, error);
      return fallback;
    }
  };

  ITN.saveJSON = function (key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn("[ITN] saveJSON error:", key, error);
      return false;
    }
  };

  ITN.uid = function (prefix) {
    prefix = prefix || "id";
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  };

  ITN.nowISO = function () {
    return new Date().toISOString();
  };
})();
