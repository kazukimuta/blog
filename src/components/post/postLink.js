import React from 'react'
import { Link } from 'gatsby'

import './post.css'

const PostLink = ({ post }) => {
  return (
    <div className="post-preview">
      <Link to={post.frontmatter.path} className="post-link">
        <h2 className="post-title">{post.frontmatter.title}</h2>
        <h3 className="post-subtitle">{post.excerpt}</h3>
      </Link>
      <p className="post-meta">Posted on {post.frontmatter.date}</p>
    </div>
  )
}

export default PostLink
