const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function featureSkills() {
  console.log('Fetching initial skills...')
  const { data: skills, error } = await supabase
    .from('skills')
    .select('id, name')
    .limit(5)

  if (error) {
    console.error('Error fetching skills:', error)
    return
  }

  if (!skills || skills.length === 0) {
    console.log('No skills found to feature.')
    return
  }

  console.log(`Found ${skills.length} skills. Featuring them...`)
  
  for (const skill of skills) {
    const { error: updateError } = await supabase
      .from('skills')
      .update({ is_featured: true })
      .eq('id', skill.id)
    
    if (updateError) {
      console.error(`Error featuring skill ${skill.name}:`, updateError)
    } else {
      console.log(`Featured: ${skill.name}`)
    }
  }

  // Also set some categories if they are null
  const categories = ['Finance', 'Code', 'Research', 'Utility']
  const { data: allSkills } = await supabase.from('skills').select('id, category')
  
  for (const s of allSkills || []) {
    if (!s.category) {
      const randomCat = categories[Math.floor(Math.random() * categories.length)]
      await supabase.from('skills').update({ category: randomCat }).eq('id', s.id)
      console.log(`Set category for ${s.id} to ${randomCat}`)
    }
  }
}

featureSkills()
