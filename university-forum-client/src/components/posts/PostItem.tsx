import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updatePost, deletePost, createPost } from '../../api/posts';
import { Post } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { canModifyPost, canDeleteContent } from '../../utils/permissions';

interface PostItemProps {
    post: Post;
    threadId: number;
    categoryId: number;
}

const PostItem: React.FC<PostItemProps> = ({ post, threadId, categoryId }) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [isReplying, setIsReplying] = useState(false);
    const [editContent, setEditContent] = useState(post.content);
    const [replyContent, setReplyContent] = useState('');
    
    const updateMutation = useMutation({
        mutationFn: () => updatePost(post.id, editContent),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['posts', threadId.toString()] });
            setIsEditing(false);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: () => deletePost(post.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['posts', threadId.toString()] });
        }
    });

    const replyMutation = useMutation({
        mutationFn: () => createPost(threadId, { 
            content: replyContent,
            parent_id: post.id 
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['posts', threadId.toString()] });
            setIsReplying(false);
            setReplyContent('');
        }
    });

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this post?')) {
            await deleteMutation.mutateAsync();
        }
    };

    const handleUpdate = async () => {
        if (editContent.trim()) {
            await updateMutation.mutateAsync();
        }
    };

    const handleReply = async () => {
        if (replyContent.trim()) {
            await replyMutation.mutateAsync();
        }
    };

    const canModify = user?.id === post.author_id || post.can_moderate;
    const canDelete = user?.id === post.author_id || post.can_moderate;
    const isMaxDepth = post.depth >= 3;
    
    // Calculate left margin based on depth
    const depthMargin = `${post.depth * 2}rem`;

    return (
        <div style={{ marginLeft: depthMargin }} className="mb-4">
            <div className={`bg-white shadow-sm rounded-lg p-6 ${post.depth > 0 ? 'border-l-4 border-blue-200' : ''}`}>
                {/* Post Header */}
                <div className="flex justify-between">
                    <div className="flex items-center space-x-2">
                        <div className="text-sm text-gray-500">
                            {post.author?.email || 'Deleted User'} • {new Date(post.created_at).toLocaleDateString()}
                        </div>
                        {post.depth > 0 && (
                            <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full">
                                Level {post.depth} Reply
                            </span>
                        )}
                    </div>
                    {!post.deleted_at && (canModify || canDelete) && (
                        <div className="space-x-2">
                            {canModify && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="text-sm text-gray-600 hover:text-indigo-600"
                                >
                                    Edit
                                </button>
                            )}
                            {canDelete && (
                                <button
                                    onClick={handleDelete}
                                    disabled={deleteMutation.isPending}
                                    className="text-sm text-red-600 hover:text-red-700"
                                >
                                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Post Content */}
                {isEditing ? (
                    <div className="mt-4">
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full p-2 border rounded-md"
                            rows={4}
                        />
                        <div className="mt-2 flex justify-end space-x-2">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-3 py-1 text-gray-600 hover:text-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdate}
                                disabled={updateMutation.isPending}
                                className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                            >
                                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="mt-2 prose">
                        {post.visible_content}
                    </div>
                )}

                {/* Reply Button and Form */}
                {!post.deleted_at && user && !isMaxDepth && (
                    <div className="mt-4">
                        {!isReplying ? (
                            <button
                                onClick={() => setIsReplying(true)}
                                className="text-sm text-gray-600 hover:text-indigo-600"
                            >
                                Reply
                            </button>
                        ) : (
                            <div className="space-y-2">
                                <textarea
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    className="w-full p-2 border rounded-md"
                                    rows={3}
                                    placeholder="Write your reply..."
                                />
                                <div className="flex justify-end space-x-2">
                                    <button
                                        onClick={() => setIsReplying(false)}
                                        className="px-3 py-1 text-gray-600 hover:text-gray-800"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleReply}
                                        disabled={replyMutation.isPending}
                                        className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                                    >
                                        {replyMutation.isPending ? 'Posting...' : 'Post Reply'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Max Depth Warning */}
                {isMaxDepth && user && (
                    <div className="mt-4 text-sm text-orange-600 bg-orange-50 p-2 rounded-md">
                        Maximum reply depth (Level 3) reached. No further replies allowed at this level.
                    </div>
                )}

                {/* Replies */}
                {post.replies && post.replies.length > 0 && (
                    <div className="mt-4 space-y-4">
                        {post.replies.map(reply => (
                            <PostItem
                                key={reply.id}
                                post={reply}
                                threadId={threadId}
                                categoryId={categoryId}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PostItem;