const express = require('express');
const router = express.Router();
const { validationResult, check } = require('express-validator');
const auth = require('../../Middleware/auth');
const User = require('../../Models/User');
const Post = require('../../Models/Post');
const Profile = require('../../Models/Profile');
const req = require('express/lib/request');
const mongoose = require('mongoose');

// @route   POST api/posts
// @desc    Creat a post
// @access  Private
router.post(
	'/',
	[auth, [check('text', 'Text id required').not().isEmpty()]],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}
		try {
			const user = await User.findById(req.user.id).select('-password');
			const newPost = new Post({
				text: req.body.text,
				name: user.name,
				avatar: user.avatar,
				user: req.user.id,
			});
			const post = await newPost.save();
			res.json(post);
		} catch (err) {
			console.error(err.message);
			res.status(500).send('Server Error');
		}
	}
);

// @route   Get api/posts
// @desc    Get all posts
// @access  Private
router.get('/', auth, async (req, res) => {
	try {
		const posts = await Post.find().sort({ date: -1 });
		res.json(posts);
	} catch (err) {
		console.log(err);
		res.status(500).send('Server Error');
	}
});

// @route   Get api/posts/:id
// @desc    Get post by Id
// @access  Private
router.get('/:id', auth, async (req, res) => {
	try {
		const post = await Post.findById(req.params.id);
		if (!post) {
			return res.status(404).json({ msg: 'Post not Found' });
		}
		res.json(post);
	} catch (err) {
		console.log(err);
		if (err.kind === 'ObjectId') {
			return res.status(404).json({ msg: 'Post not Found' });
		}
		res.status(500).send('Server Error');
	}
});

// @route   Delete api/posts/:id
// @desc    Delete post
// @access  Private
router.delete('/:id', auth, async (req, res) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
			return res.status(400).json({ msg: 'Invalid Post ID format' });
		}

		post = await Post.findById(req.params.id);

		if (!post) {
			return res.status(404).json({ msg: 'Post not Found' });
		}

		// Check user
		if (post.user.toString() !== req.user.id) {
			return res.status(401).json({ msg: 'User not Authorized' });
		}

		await post.deleteOne();
		res.json({ msg: 'Post removed' });
	} catch (err) {
		console.log(err);
		res.status(500).send('Server Error');
	}
});

// @route   PUT api/posts/like/:id
// @desc    Like a post
// @access  Private
router.put('/like/:id', auth, async (req, res) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
			return res.status(400).json({ msg: 'Invalid Post ID format' });
		}

		const post = await Post.findById(req.params.id);

		// Check if the post has already been liked
		if (post.likes.some((like) => like.user.toString() === req.user.id)) {
			return res.status(400).json({ msg: 'Post already liked' });
		}

		post.likes.unshift({ user: req.user.id });
		await post.save();

		return res.json(post.likes);
	} catch (err) {
		console.log(err);
		res.status(500).send('Server Error');
	}
});

// @route   PUT api/posts/unlike/:id
// @desc    Unlike a post
// @access  Private
router.put('/unlike/:id', auth, async (req, res) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
			return res.status(400).json({ msg: 'Invalid Post ID format' });
		}

		const post = await Post.findById(req.params.id);

		// Check if the post has already been liked
		if (!post.likes.some((like) => like.user.toString() === req.user.id)) {
			return res.status(400).json({ msg: 'Post has not yet been liked' });
		}

		const removeIndex = post.likes
			.map((like) => like.user.toString())
			.indexOf(req.user.id);

		post.likes.splice(removeIndex, 1);

		await post.save();

		return res.json(post.likes);
	} catch (err) {
		console.log(err);
		res.status(500).send('Server Error');
	}
});

// @route   POST api/posts/comment/:id
// @desc    comment on a post
// @access  Private
router.post(
	'/comment/:id',
	[auth, [check('text', 'Text is required').not().isEmpty()]],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}
		// Check if post ID is wrong
		if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
			return res.status(400).json({ msg: 'Invalid Post ID format' });
		}

		try {
			const user = await User.findById(req.user.id).select('-password');
			const post = await Post.findById(req.params.id);

			if (!post) {
				return res.status(404).json({ msg: 'Post not Found' });
			}

			const newComment = {
				text: req.body.text,
				name: user.name,
				avatar: user.avatar,
				user: user.id,
			};
			post.comments.unshift(newComment);
			await post.save();
			res.json(post.comments);
		} catch (err) {
			console.error(err.message);
			res.status(500).send('Server Error');
		}
	}
);

// @route   DELETE api/posts/comment/delete/:postId/:commentId
// @desc    Delete comment on a post
// @access  Private
router.delete('/comment/delete/:postId/:commentId', auth, async (req, res) => {
	try {
		// Get the postId and commentId from req.params
		const { postId, commentId } = req.params;

		// Check if postId and commentId are valid
		if (!mongoose.Types.ObjectId.isValid(postId)) {
			return res.status(400).json({ msg: 'Invalid Post ID format' });
		}
		if (!mongoose.Types.ObjectId.isValid(commentId)) {
			return res.status(400).json({ msg: 'Invalid Comment ID format' });
		}

		// Find the post by ID
		const post = await Post.findById(postId);

		if (!post) {
			return res.status(404).json({ msg: 'Post not found' });
		}

		// Find the comment in the post
		const commentToDelete = post.comments.find(
			(comment) => comment.id === commentId
		);

		if (!commentToDelete) {
			return res.status(404).json({ msg: 'Comment not found' });
		}

		// Check if the user is the author of the comment
		if (commentToDelete.user.toString() !== req.user.id) {
			return res.status(401).json({ msg: 'User not Authorized' });
		}

		// Remove the comment
		post.comments = post.comments.filter((comment) => comment.id !== commentId);

		await post.save();

		res.json({ msg: 'Comment succesfully deleted ' });
	} catch (err) {
		console.error(err.message);
		res.status(500).send('Server Error');
	}
});

module.exports = router;
