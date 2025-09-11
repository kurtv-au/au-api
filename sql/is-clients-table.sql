create table dbo.cltClients
(
    cltId                        int identity
        constraint PK_cltClients
            primary key
                with (fillfactor = 90),
    Stamp                        datetime
        constraint DF_cltClients_Stamp default getdate()               not null,
    ClientNumber                 decimal(10)                           not null
        constraint IX_cltClients
            unique
                with (fillfactor = 90),
    ClientName                   varchar(255)                          not null,
    MesgResps                    ntext
        constraint DF_cltClients_MesgResps default ''                  not null,
    msgScriptId                  int
        constraint FK_cltClients_msgScripts
            references dbo.msgScripts,
    MaxSchedCalls                int,
    ScreenLayout                 ntext
        constraint DF_cltClients_ScreenLayout default ''               not null,
    subId                        int
        constraint FK_cltClients_dirSubjects
            references dbo.dirSubjects,
    viewId                       int
        constraint FK_cltClients_dirViews
            references dbo.dirViews,
    searchId                     int,
    SaveDiscardedMessages        bit
        constraint DF_cltClients_SaveDiscardedMessages default 1       not null,
    MsgPurgeTime                 int,
    CheckinPending               bit
        constraint DF_cltClients_CheckinPending default 0              not null,
    SandboxSearch                ntext,
    Url                          nvarchar(1000)
        constraint DF_cltClients_Url default ''                        not null,
    TimezoneOffset               bigint
        constraint DF_cltClients_TimezoneOffset default 0              not null,
    ocschedID                    int,
    FilterRoledefIDs             ntext,
    LogVoice                     bit
        constraint DF_cltClients_LogVoice default 0                    not null,
    PerfectAnswer                bit
        constraint DF_cltClients_PerfectAnswer default 0               not null,
    msgScriptIDWeb               int
        constraint FK_cltClients_msgScripts1
            references dbo.msgScripts,
    msgScriptIDWebMessaging      int
        constraint FK_cltClients_msgScripts2
            references dbo.msgScripts,
    BillingCode                  nvarchar(150)
        constraint DF_cltClients_BillingCode default ''                not null,
    DefaultBehaviorType          int
        constraint DF_cltClients_DefaultBehaviorType default 0         not null,
    DefaultBehaviorParameter     ntext,
    AutoConnect                  bit
        constraint DF_cltClients_AutoConnect default 0                 not null,
    Emergency                    bit
        constraint DF_cltClients_Emergency default 0                   not null,
    DoneKeyCancelsScript         bit
        constraint DF_cltClients_DoneKeyCancelsScript default 0        not null,
    msgScriptIDMergeComm         int
        constraint FK_cltClients_msgScripts3
            references dbo.msgScripts,
    HangupRemovesWorkArea        bit
        constraint DF_cltClients_HangupRemovesWorkArea default 0       not null,
    TransferConfRemovesWorkArea  bit
        constraint DF_cltClients_TransferConfRemovesWorkArea default 0 not null,
    PciCompliance                bit
        constraint DF_cltClients_PciCompliance default 0               not null,
    ReassignTime                 int,
    DefaultRoute                 int,
    MusicOnHold                  int,
    OverrideOpLimit              bit
        constraint DF_cltClients_OverrideLimit default 0               not null,
    MusicOnHoldAfterAutoAnswer   int,
    AutoAnswerRings              int,
    AnnounceATTA                 bit
        constraint DF_cltClients_AnnounceATTA default 0                not null,
    RepeatATTA                   bit
        constraint DF_cltClients_RepeatATTA default 0                  not null,
    AnnounceCallsInQue           bit
        constraint DF_cltClients_AnnounceCallsInQue default 0          not null,
    CallerIdNumber               nvarchar(20),
    CallerIdName                 nvarchar(100),
    ViewMessagesDefaultFilterOld nvarchar(500),
    Skill                        int
        constraint DF_clients_skill default 0                          not null,
    DontStartScriptOnFetch       bit
        constraint DF_cltClients_DontStartScriptOnFetch default 0      not null,
    ScreenCapture                bit
        constraint DF_cltClients_ScreenCapture default 0               not null,
    MaxCallsFromDispatchJobs     int
        constraint DF_cltClients_MaxCallsFromDispatchJobs default 10   not null,
    SelectNextUndelMsgWhenDel    bit
        constraint DF_cltClients_SelectNextUndelMsgWhenDel default 0   not null,
    playQualityPrompt            bit
        constraint DF_cltClients_playQualityPrompt default 0           not null,
    loggerBeep                   bit
        constraint DF_cltClients_loggerBeep default 0                  not null,
    LoggerBeepInterval           int
        constraint DF_cltClients_loggerBeepInterval default 15         not null,
    AutoAnswerInterval           int
        constraint DF_cltClients_autoAnswerInterval default 0          not null,
    specialOldToNew              bit
        constraint DF_cltClients_specialOldToNew default 0             not null,
    saveEditedSpecial            bit
        constraint DF_cltClients_saveEditedSpecial default 0           not null,
    showSpecials                 bit
        constraint DF_cltClients_showSpecials default 0                not null,
    showInfos                    bit
        constraint DF_cltClients_showInfos default 0                   not null,
    ViewMessagesDefaultFilter    nvarchar(max),
    CheckinPasscode              nvarchar(100),
    DirectCheckin                bit
        constraint DF_cltClients_DirectCheckin default 0               not null,
    DefaultCOS                   int
        constraint DF_cltClients_DefaultCOS default (-1)               not null,
    VoiceMailMaxLength           int
        constraint DF_cltClients_VoiceMailMaxLength default 300        not null,
    VoiceMailPlayBeep            bit
        constraint DF_cltClients_VoiceMailPlayBeep default 1           not null,
    VoiceMailOldToNew            bit
        constraint DF_cltClients_VoiceMailOldToNew default 0           not null,
    VoiceMailAnnounce            int
        constraint DF_cltClients_VoiceMailAnnounce default 0           not null,
    VoiceMailRevert              bit
        constraint DF_cltClients_VoiceMailRevert default 0             not null,
    VmChgPasscode                bit
        constraint DF_cltClients_VmChgPasscode default 0               not null,
    VmChgGreeting                bit
        constraint DF_cltClients_VmChgGreeting default 0               not null,
    VoiceMailPrivate             bit
        constraint DF_cltClients_VoiceMailPrivate default 0            not null,
    VoiceMailAni                 bit
        constraint DF_cltClients_VoiceMailAni default 0                not null,
    SecureVMTransfer             bit
        constraint DF_cltClients_SecureVMTransfer default 0            not null,
    NewVmRunsMergecomm           bit
        constraint DF_cltClients_NewVmRunsMergecomm default 0          not null,
    ExcludeFromSurvey            bit
        constraint DF_cltClients_ExcludeFromSurvey default 0           not null,
    VoiceMailMenu                int
        constraint DF_cltClients_VoiceMailMenu default 0               not null,
    VoiceMailGreetOptions        int
        constraint DF_cltClients_VoiceMailGreetOptions default 0       not null,
    AnswerPhrase                 nvarchar(2000)
        constraint DF_cltClients_AnswerPhrase default ''               not null,
    LogWhenMessageViewed         bit                                   not null,
    msgScriptIdAcd               int,
    DIDLimit                     int                                   not null,
    UseOrgClientForDIDLimit      bit                                   not null,
    AniSources                   nvarchar(max),
    AniBehavior                  nvarchar(max),
    ExemptFromSystemHoliday      bit                                   not null,
    RecordPatch                  bit                                   not null
)
go