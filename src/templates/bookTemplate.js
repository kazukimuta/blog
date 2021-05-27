import React from 'react'
import { graphql } from 'gatsby'

import Layout from '../components/layout/layout'
import DocHeader from '../components/doc-header'
import Config from '../config/config'

import '../components/extraStyle/articleMarkup.css'
import '../components/extraStyle/highlight.css'
import '../components/extraStyle/book-aff-link.css'

export default function Template({ data }) {
  const { markdownRemark } = data
  const { frontmatter, html } = markdownRemark
  const main = (
    <div
      className="blog-post-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
  const affLink = !frontmatter.amazonaff ? (
    ''
  ) : (
    <div
      className="book-aff-link"
      dangerouslySetInnerHTML={{ __html: frontmatter.amazonaff }}
    />
  )

  const pageTitle = `${frontmatter.title}`
  const frontmatterKeyword = frontmatter.keyword || ''
  const keywords = frontmatterKeyword.split(',') || Config.blogKeyword
  return (
    <Layout frontmatter={frontmatter} isRoot={false}>
      <DocHeader title={pageTitle} keywords={keywords} />
      {main}
      {affLink}
    </Layout>
  )
}

export const pageQuery = graphql`
  query ($path: String!) {
    markdownRemark(frontmatter: { path: { eq: $path } }) {
      html
      frontmatter {
        date(formatString: "MMMM DD, YYYY")
        path
        title
        amazonaff
        keyword
        tags
        type
      }
    }
  }
`
