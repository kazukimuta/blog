import React from 'react'
import { Link } from 'gatsby'
import moment from 'moment'

const PostLink = ({ post }) => {
  const tags = Array.isArray(post.frontmatter.tags)
    ? post.frontmatter.tags.map((tag, i) => {
        return (
          <span key={i} className="post-tag">
            {tag}
          </span>
        )
      })
    : []
  return (
    <div className="post-link">
      <Link to={post.frontmatter.path}>
        <div className="post-row">
          <p className="post-meta">
            {moment(post.frontmatter.date).format('YY/MM/DD')}
          </p>
          <div>
            <h2 className="post-title">{post.frontmatter.title}</h2>
            {tags}
          </div>
        </div>
      </Link>
    </div>
  )
}

export default PostLink
