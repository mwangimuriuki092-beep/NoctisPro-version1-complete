"""
NoctisPro PACS - Chat URLs
Real-time communication and messaging endpoints
"""

from django.urls import path
from . import views

app_name = 'chat'

urlpatterns = [
    # Chat Dashboard
    path('', views.ChatDashboardView.as_view(), name='dashboard'),
    
    # Room Management
    path('rooms/', views.RoomListView.as_view(), name='room_list'),
    path('rooms/create/', views.CreateRoomView.as_view(), name='create_room'),
    path('rooms/<uuid:room_id>/', views.RoomDetailView.as_view(), name='room_detail'),
    path('rooms/<uuid:room_id>/edit/', views.EditRoomView.as_view(), name='edit_room'),
    path('rooms/<uuid:room_id>/delete/', views.DeleteRoomView.as_view(), name='delete_room'),
    path('rooms/<uuid:room_id>/leave/', views.LeaveRoomView.as_view(), name='leave_room'),
    
    # Room Chat Interface
    path('rooms/<uuid:room_id>/chat/', views.ChatRoomView.as_view(), name='chat_room'),
    
    # Direct Messages
    path('direct/', views.DirectMessageListView.as_view(), name='direct_list'),
    path('direct/<int:user_id>/', views.DirectMessageView.as_view(), name='direct_message'),
    path('direct/create/<int:user_id>/', views.CreateDirectRoomView.as_view(), name='create_direct'),
    
    # Message Management
    path('messages/<uuid:message_id>/edit/', views.EditMessageView.as_view(), name='edit_message'),
    path('messages/<uuid:message_id>/delete/', views.DeleteMessageView.as_view(), name='delete_message'),
    path('messages/<uuid:message_id>/react/', views.ReactToMessageView.as_view(), name='react_message'),
    
    # Participants
    path('rooms/<uuid:room_id>/participants/', views.ParticipantListView.as_view(), name='participant_list'),
    path('rooms/<uuid:room_id>/invite/', views.InviteParticipantView.as_view(), name='invite_participant'),
    path('rooms/<uuid:room_id>/participants/<int:user_id>/remove/', views.RemoveParticipantView.as_view(), name='remove_participant'),
    path('rooms/<uuid:room_id>/participants/<int:user_id>/role/', views.UpdateParticipantRoleView.as_view(), name='update_role'),
    
    # Invitations
    path('invitations/', views.InvitationListView.as_view(), name='invitation_list'),
    path('invitations/<int:invitation_id>/accept/', views.AcceptInvitationView.as_view(), name='accept_invitation'),
    path('invitations/<int:invitation_id>/decline/', views.DeclineInvitationView.as_view(), name='decline_invitation'),
    
    # Moderation
    path('rooms/<uuid:room_id>/moderation/', views.ModerationLogView.as_view(), name='moderation_log'),
    path('rooms/<uuid:room_id>/moderate/<int:user_id>/', views.ModerateUserView.as_view(), name='moderate_user'),
    
    # File Sharing
    path('rooms/<uuid:room_id>/upload/', views.UploadFileView.as_view(), name='upload_file'),
    path('files/<int:file_id>/download/', views.DownloadFileView.as_view(), name='download_file'),
    
    # Study References
    path('rooms/<uuid:room_id>/share-study/<int:study_id>/', views.ShareStudyView.as_view(), name='share_study'),
    
    # Settings
    path('settings/', views.ChatSettingsView.as_view(), name='settings'),
    path('settings/update/', views.UpdateChatSettingsView.as_view(), name='update_settings'),
    
    # Search
    path('search/', views.SearchMessagesView.as_view(), name='search'),
    
    # API Endpoints
    path('api/rooms/', views.RoomListAPIView.as_view(), name='api_room_list'),
    path('api/rooms/<uuid:room_id>/messages/', views.MessageListAPIView.as_view(), name='api_message_list'),
    path('api/rooms/<uuid:room_id>/messages/send/', views.SendMessageAPIView.as_view(), name='api_send_message'),
    path('api/rooms/<uuid:room_id>/mark-read/', views.MarkRoomAsReadAPIView.as_view(), name='api_mark_read'),
    path('api/online-users/', views.OnlineUsersAPIView.as_view(), name='api_online_users'),
    path('api/unread-count/', views.UnreadCountAPIView.as_view(), name='api_unread_count'),
]
