mod test;
use dep::aztec::macros::aztec;

#[aztec]
pub contract EasyPrivateVoting {
    use dep::aztec::{
        keys::getters::get_public_keys,
        macros::{functions::{initializer, internal, private, public, utility}, storage::storage},
    };
    use dep::aztec::prelude::{AztecAddress, Map, PublicImmutable, PublicMutable};
    use dep::aztec::protocol_types::{storage, traits::{Hash, ToField}};

    #[storage]
    struct Storage<Context> {
        admin: PublicMutable<AztecAddress, Context>,
        tally: Map<Field, PublicMutable<Field, Context>, Context>,
        vote_ended: PublicMutable<bool, Context>,
        active_at_block: PublicImmutable<u32, Context>,
    }

    #[initializer]
    #[public]
    fn constructor(admin: AztecAddress) {
        storage.admin.write(admin);
        storage.vote_ended.write(false);
        storage.active_at_block.initialize(context.block_number());
    }

    #[private]
    fn cast_vote(candidate: Field) {
        let msg_sender_npk_m_hash = get_public_keys(context.msg_sender()).npk_m.hash();
        let secret = context.request_nsk_app(msg_sender_npk_m_hash);
        let nullifier = std::hash::pedersen_hash([context.msg_sender().to_field(), secret]);
        context.push_nullifier(nullifier);

        EasyPrivateVoting::at(context.this_address()).add_to_tally_public(candidate).enqueue(
            &mut context,
        );
    }

    #[public]
    #[internal]
    fn add_to_tally_public(candidate: Field) {
        assert(storage.vote_ended.read() == false, "Vote has ended");
        let new_tally = storage.tally.at(candidate).read() + 1;
        storage.tally.at(candidate).write(new_tally);
    }

    #[public]
    fn end_vote() {
        // assert(storage.vote_ended.read() == false, "Vote has ended");
        assert(storage.admin.read().eq(context.msg_sender()), "Only admin can end vote");
        storage.vote_ended.write(true);
    }

    #[utility]
    unconstrained fn get_vote(candidate: Field) -> Field {
        storage.tally.at(candidate).read()
    }

    #[utility]
    unconstrained fn get_vote_ended() -> bool {
        storage.vote_ended.read()
    }

    #[utility]
    unconstrained fn get_admin() -> AztecAddress {
        storage.admin.read()
    }

    #[utility]
    unconstrained fn get_active_at_block() -> u32 {
        storage.active_at_block.read()
    }

}
