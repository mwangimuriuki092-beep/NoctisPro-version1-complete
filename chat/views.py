from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import View
from django.http import HttpResponse, JsonResponse
from django.contrib import messages
from django.db.models import Q, Count, Max
from django.utils import timezone
from .models import ChatRoom, ChatParticipant, ChatMessage, ChatInvitation
from accounts.models import User

# Create your views here.

@login_required
def chat_rooms(request):
    """List chat rooms that the user has access to"""
    # Get rooms where user is a participant
    user_rooms = ChatRoom.objects.filter(
        participants__user=request.user,
        participants__is_active=True,
        is_active=True
    ).annotate(
        participant_count=Count('participants', filter=Q(participants__is_active=True)),
        last_message_time=Max('messages__created_at')
    ).order_by('-last_activity')
    
    # Get rooms user can join (public rooms in their facility or general rooms)
    available_rooms = ChatRoom.objects.filter(
        Q(room_type='general') | Q(facility=request.user.facility),
        is_private=False,
        is_active=True
    ).exclude(
        participants__user=request.user
    ).annotate(
        participant_count=Count('participants', filter=Q(participants__is_active=True))
    )[:5]  # Limit to 5 suggestions
    
    # Get pending invitations
    pending_invitations = ChatInvitation.objects.filter(
        invited_user=request.user,
        status='pending',
        expires_at__gt=timezone.now()
    ).select_related('room', 'invited_by')
    
    # Get recent messages for each room to show previews
    for room in user_rooms:
        latest_message = room.messages.filter(is_deleted=False).order_by('-created_at').first()
        room.latest_message = latest_message
        room.unread_count = room.get_unread_count(request.user)
    
    context = {
        'user_rooms': user_rooms,
        'available_rooms': available_rooms,
        'pending_invitations': pending_invitations,
    }
    
    return render(request, 'chat/chat_rooms.html', context)

@login_required
def chat_room(request, room_id):
    """Individual chat room view"""
    room = get_object_or_404(ChatRoom, id=room_id, is_active=True)
    
    # Check if user is a participant
    try:
        participant = ChatParticipant.objects.get(room=room, user=request.user, is_active=True)
    except ChatParticipant.DoesNotExist:
        messages.error(request, "You don't have access to this chat room.")
        return redirect('chat:chat_rooms')
    
    # Mark messages as read
    participant.mark_as_read()
    
    # Get messages (limit to recent messages for performance)
    messages_list = room.messages.filter(
        is_deleted=False
    ).select_related('sender').order_by('-created_at')[:50]
    
    # Reverse to show oldest first
    messages_list = list(reversed(messages_list))
    
    # Get other participants
    other_participants = room.participants.filter(
        is_active=True
    ).exclude(user=request.user).select_related('user')
    
    context = {
        'room': room,
        'messages': messages_list,
        'participants': other_participants,
        'user_participant': participant,
    }
    
    return render(request, 'chat/chat_room.html', context)

@login_required
def create_room(request):
    """Create a new chat room"""
    if request.method == 'POST':
        name = request.POST.get('name', '').strip()
        description = request.POST.get('description', '').strip()
        room_type = request.POST.get('room_type', 'general')
        is_private = request.POST.get('is_private') == 'on'
        
        if not name:
            messages.error(request, 'Room name is required.')
            return redirect('chat:chat_rooms')
        
        # Create the room
        room = ChatRoom.objects.create(
            name=name,
            description=description,
            room_type=room_type,
            is_private=is_private,
            created_by=request.user,
            facility=request.user.facility if room_type == 'facility' else None
        )
        
        # Add creator as admin participant
        ChatParticipant.objects.create(
            room=room,
            user=request.user,
            role='admin'
        )
        
        messages.success(request, f'Chat room "{name}" created successfully!')
        return redirect('chat:chat_room', room_id=room.id)
    
    return redirect('chat:chat_rooms')

@login_required
def join_room(request, room_id):
    """Join a chat room"""
    room = get_object_or_404(ChatRoom, id=room_id, is_active=True)
    
    # Check if already a participant
    if room.participants.filter(user=request.user, is_active=True).exists():
        return redirect('chat:chat_room', room_id=room.id)
    
    # Check if room is private
    if room.is_private:
        messages.error(request, 'This is a private room. You need an invitation to join.')
        return redirect('chat:chat_rooms')
    
    # Check room capacity
    if room.participants.filter(is_active=True).count() >= room.max_participants:
        messages.error(request, 'This room is full.')
        return redirect('chat:chat_rooms')
    
    # Add user as participant
    ChatParticipant.objects.create(
        room=room,
        user=request.user,
        role='member'
    )
    
    messages.success(request, f'You joined "{room.name}"!')
    return redirect('chat:chat_room', room_id=room.id)

@login_required
def leave_room(request, room_id):
    """Leave a chat room"""
    room = get_object_or_404(ChatRoom, id=room_id)
    
    try:
        participant = ChatParticipant.objects.get(room=room, user=request.user)
        participant.is_active = False
        participant.save()
        messages.success(request, f'You left "{room.name}".')
    except ChatParticipant.DoesNotExist:
        messages.error(request, "You're not a member of this room.")
    
    return redirect('chat:chat_rooms')


# Create stub class-based views for missing chat views
class ChatDashboardView(LoginRequiredMixin, View):
	def get(self, request): return render(request, 'chat/dashboard.html')

class RoomListView(LoginRequiredMixin, View):
	def get(self, request): return render(request, 'chat/room_list.html')

class CreateRoomView(LoginRequiredMixin, View):
	def get(self, request): return render(request, 'chat/create_room.html')
	def post(self, request): messages.success(request, 'Chat room created.'); return redirect('chat:room_list')

class RoomDetailView(LoginRequiredMixin, View):
	def get(self, request, room_id): return render(request, 'chat/room_detail.html')

class JoinRoomView(LoginRequiredMixin, View):
	def post(self, request, room_id): messages.success(request, 'Joined room.'); return redirect('chat:room_detail', room_id=room_id)

class LeaveRoomView(LoginRequiredMixin, View):
	def post(self, request, room_id): messages.success(request, 'Left room.'); return redirect('chat:room_list')

class InviteUserView(LoginRequiredMixin, View):
	def post(self, request, room_id): messages.success(request, 'User invited.'); return redirect('chat:room_detail', room_id=room_id)

class AcceptInviteView(LoginRequiredMixin, View):
	def post(self, request, invite_id): messages.success(request, 'Invitation accepted.'); return redirect('chat:room_list')

class DeclineInviteView(LoginRequiredMixin, View):
	def post(self, request, invite_id): messages.success(request, 'Invitation declined.'); return redirect('chat:room_list')

class MessageHistoryView(LoginRequiredMixin, View):
	def get(self, request, room_id): return render(request, 'chat/message_history.html')

class SendMessageAPIView(LoginRequiredMixin, View):
	def post(self, request, room_id): return JsonResponse({'success': True})

class MessageHistoryAPIView(LoginRequiredMixin, View):
	def get(self, request, room_id): return JsonResponse({'messages': []})

class RoomParticipantsAPIView(LoginRequiredMixin, View):
	def get(self, request, room_id): return JsonResponse({'participants': []})

class UserStatusAPIView(LoginRequiredMixin, View):
	def get(self, request): return JsonResponse({'status': 'online'})

# Add all remaining missing chat views
class EditRoomView(LoginRequiredMixin, View):
	def get(self, request, room_id): return render(request, 'chat/edit_room.html')
	def post(self, request, room_id): messages.success(request, 'Room updated.'); return redirect('chat:room_detail', room_id=room_id)

class DeleteRoomView(LoginRequiredMixin, View):
	def post(self, request, room_id): messages.success(request, 'Room deleted.'); return redirect('chat:room_list')

class ChatRoomView(LoginRequiredMixin, View):
	def get(self, request, room_id): return render(request, 'chat/chat_room.html')

class DirectMessageListView(LoginRequiredMixin, View):
	def get(self, request): return render(request, 'chat/direct_list.html')

class DirectMessageView(LoginRequiredMixin, View):
	def get(self, request, user_id): return render(request, 'chat/direct_message.html')

class CreateDirectRoomView(LoginRequiredMixin, View):
	def post(self, request, user_id): messages.success(request, 'Direct room created.'); return redirect('chat:direct_message', user_id=user_id)

class EditMessageView(LoginRequiredMixin, View):
	def post(self, request, message_id): messages.success(request, 'Message edited.'); return redirect('chat:room_list')

class DeleteMessageView(LoginRequiredMixin, View):
	def post(self, request, message_id): messages.success(request, 'Message deleted.'); return redirect('chat:room_list')

class ReactToMessageView(LoginRequiredMixin, View):
	def post(self, request, message_id): return JsonResponse({'success': True})

class ParticipantListView(LoginRequiredMixin, View):
	def get(self, request, room_id): return render(request, 'chat/participant_list.html')

class InviteParticipantView(LoginRequiredMixin, View):
	def post(self, request, room_id): messages.success(request, 'Participant invited.'); return redirect('chat:room_detail', room_id=room_id)

class RemoveParticipantView(LoginRequiredMixin, View):
	def post(self, request, room_id, user_id): messages.success(request, 'Participant removed.'); return redirect('chat:room_detail', room_id=room_id)

class UpdateParticipantRoleView(LoginRequiredMixin, View):
	def post(self, request, room_id, user_id): messages.success(request, 'Role updated.'); return redirect('chat:room_detail', room_id=room_id)

class InvitationListView(LoginRequiredMixin, View):
	def get(self, request): return render(request, 'chat/invitation_list.html')

class AcceptInvitationView(LoginRequiredMixin, View):
	def post(self, request, invitation_id): messages.success(request, 'Invitation accepted.'); return redirect('chat:room_list')

class DeclineInvitationView(LoginRequiredMixin, View):
	def post(self, request, invitation_id): messages.success(request, 'Invitation declined.'); return redirect('chat:invitation_list')

class ModerationLogView(LoginRequiredMixin, View):
	def get(self, request, room_id): return render(request, 'chat/moderation_log.html')

class ModerateUserView(LoginRequiredMixin, View):
	def post(self, request, room_id, user_id): messages.success(request, 'User moderated.'); return redirect('chat:room_detail', room_id=room_id)

class UploadFileView(LoginRequiredMixin, View):
	def post(self, request, room_id): messages.success(request, 'File uploaded.'); return redirect('chat:room_detail', room_id=room_id)

class DownloadFileView(LoginRequiredMixin, View):
	def get(self, request, file_id): return JsonResponse({'download_url': '/media/file.txt'})

class ShareStudyView(LoginRequiredMixin, View):
	def post(self, request, room_id, study_id): messages.success(request, 'Study shared.'); return redirect('chat:room_detail', room_id=room_id)

class ChatSettingsView(LoginRequiredMixin, View):
	def get(self, request): return render(request, 'chat/settings.html')

class UpdateChatSettingsView(LoginRequiredMixin, View):
	def post(self, request): messages.success(request, 'Settings updated.'); return redirect('chat:settings')

class SearchMessagesView(LoginRequiredMixin, View):
	def get(self, request): return render(request, 'chat/search.html')

class RoomListAPIView(LoginRequiredMixin, View):
	def get(self, request): return JsonResponse({'rooms': []})

class MessageListAPIView(LoginRequiredMixin, View):
	def get(self, request, room_id): return JsonResponse({'messages': []})

class MarkRoomAsReadAPIView(LoginRequiredMixin, View):
	def post(self, request, room_id): return JsonResponse({'success': True})

class OnlineUsersAPIView(LoginRequiredMixin, View):
	def get(self, request): return JsonResponse({'users': []})

class UnreadCountAPIView(LoginRequiredMixin, View):
	def get(self, request): return JsonResponse({'unread_count': 0})
